import { ApiError } from '../utils/ApiError';
import {
  pickupRepository,
  toRequest,
  PickupRequest,
  RequestStatus,
  PickupStatus,
} from '../repositories/pickup.repository';
import { listingRepository, toListing } from '../repositories/listing.repository';
import { collectorRepository } from '../repositories/collector.repository';
import { eventBus, EVENT } from '../config/rabbitmq';
import { logActivity } from './activityLog.service';
import { collectorService } from './collector.service';
import { AuthUser } from '../types';

export const pickupService = {
  /**
   * COLLECTOR creates a pickup request for an AVAILABLE listing.
   * Requires the collector to be verified.
   */
  async createRequest(
    user: AuthUser,
    input: { listingId: number; message?: string | null }
  ): Promise<PickupRequest> {
    await collectorService.assertVerified(user.userId);

    const collector = await collectorRepository.findByUserId(user.userId);
    if (!collector) throw ApiError.forbidden('Collector profile not found');

    const listingRow = await listingRepository.findById(input.listingId);
    if (!listingRow) throw ApiError.notFound('Waste listing not found');
    // Multiple collectors may compete for the same listing, so REQUESTED is
    // still open. Only SCHEDULED/COLLECTED/CANCELLED listings are closed.
    if (!['AVAILABLE', 'REQUESTED'].includes(listingRow.status)) {
      throw ApiError.badRequest(`This listing is not open for requests (status: ${listingRow.status})`);
    }
    if (listingRow.user_id === user.userId) {
      throw ApiError.badRequest('You cannot request your own listing');
    }

    const existing = await pickupRepository.findRequestByListingAndCollector(
      input.listingId,
      collector.collector_id
    );
    if (existing) throw ApiError.conflict('You have already requested this listing');

    const requestId = await pickupRepository.createRequest({
      listingId: input.listingId,
      collectorId: collector.collector_id,
      message: input.message ?? null,
    });

    // Listing becomes REQUESTED once at least one request exists.
    await listingRepository.updateStatus(input.listingId, 'REQUESTED');

    const row = await pickupRepository.findRequestById(requestId);
    if (!row) throw new ApiError(500, 'Failed to load created request');
    const request = toRequest(row);

    await eventBus.publish(EVENT.PICKUP_REQUESTED, {
      requestId,
      listingId: input.listingId,
      producerId: request.listing.producerId,
      collectorId: collector.collector_id,
      collectorUserId: user.userId,
      collectorName: user.name,
      categoryName: request.listing.categoryName,
    });

    await logActivity({
      actorId: user.userId,
      actorRole: user.role,
      action: 'PICKUP_REQUESTED',
      entityType: 'pickup_request',
      entityId: requestId,
      description: `Requested pickup for listing #${input.listingId}`,
    });

    return request;
  },

  async listForProducer(userId: number, status?: RequestStatus): Promise<PickupRequest[]> {
    const rows = await pickupRepository.listRequestsForProducer(userId, status);
    return rows.map(toRequest);
  },

  async listForCollector(userId: number, status?: RequestStatus): Promise<PickupRequest[]> {
    const collector = await collectorRepository.findByUserId(userId);
    if (!collector) throw ApiError.notFound('Collector profile not found');
    const rows = await pickupRepository.listRequestsForCollector(collector.collector_id, status);
    return rows.map(toRequest);
  },

  async getRequest(id: number, user: AuthUser): Promise<PickupRequest> {
    const row = await pickupRepository.findRequestById(id);
    if (!row) throw ApiError.notFound('Pickup request not found');
    const request = toRequest(row);

    const isProducer = request.listing.producerId === user.userId;
    const isCollector = request.collector.userId === user.userId;
    if (!isProducer && !isCollector && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You are not part of this pickup request');
    }
    return request;
  },

  /** PRODUCER accepts a pending request: other pending requests are rejected. */
  async acceptRequest(id: number, user: AuthUser): Promise<PickupRequest> {
    const row = await pickupRepository.findRequestById(id);
    if (!row) throw ApiError.notFound('Pickup request not found');
    if (row.producer_id !== user.userId) {
      throw ApiError.forbidden('Only the owner of the listing can accept this request');
    }
    if (row.status !== 'PENDING') {
      throw ApiError.badRequest(`This request has already been ${row.status.toLowerCase()}`);
    }

    await pickupRepository.updateRequestStatus(id, 'ACCEPTED');
    await listingRepository.updateStatus(row.listing_id, 'SCHEDULED');

    // Reject the other pending requests for the same listing.
    const siblings = await pickupRepository.listRequestsForProducer(user.userId, 'PENDING');
    for (const s of siblings) {
      if (s.listing_id === row.listing_id && s.request_id !== id) {
        await pickupRepository.updateRequestStatus(s.request_id, 'REJECTED');
        await eventBus.publish(EVENT.PICKUP_REJECTED, {
          requestId: s.request_id,
          listingId: s.listing_id,
          collectorUserId: s.collector_user_id,
          categoryName: s.category_name,
        });
      }
    }

    await eventBus.publish(EVENT.PICKUP_ACCEPTED, {
      requestId: id,
      listingId: row.listing_id,
      collectorUserId: row.collector_user_id,
      categoryName: row.category_name,
    });

    await logActivity({
      actorId: user.userId,
      actorRole: user.role,
      action: 'PICKUP_ACCEPTED',
      entityType: 'pickup_request',
      entityId: id,
      description: `Accepted pickup request #${id}`,
    });

    const updated = await pickupRepository.findRequestById(id);
    if (!updated) throw ApiError.notFound('Pickup request not found');
    return toRequest(updated);
  },

  async rejectRequest(id: number, user: AuthUser): Promise<PickupRequest> {
    const row = await pickupRepository.findRequestById(id);
    if (!row) throw ApiError.notFound('Pickup request not found');
    if (row.producer_id !== user.userId) {
      throw ApiError.forbidden('Only the owner of the listing can reject this request');
    }
    if (row.status !== 'PENDING') {
      throw ApiError.badRequest(`This request has already been ${row.status.toLowerCase()}`);
    }

    await pickupRepository.updateRequestStatus(id, 'REJECTED');
    // Return the listing to the marketplace if no other requests remain.
    const remaining = await pickupRepository.countActiveRequests(row.listing_id);
    if (remaining === 0) await listingRepository.updateStatus(row.listing_id, 'AVAILABLE');

    await eventBus.publish(EVENT.PICKUP_REJECTED, {
      requestId: id,
      listingId: row.listing_id,
      collectorUserId: row.collector_user_id,
      categoryName: row.category_name,
    });

    await logActivity({
      actorId: user.userId,
      actorRole: user.role,
      action: 'PICKUP_REJECTED',
      entityType: 'pickup_request',
      entityId: id,
      description: `Rejected pickup request #${id}`,
    });

    const updated = await pickupRepository.findRequestById(id);
    if (!updated) throw ApiError.notFound('Pickup request not found');
    return toRequest(updated);
  },

  /** PRODUCER schedules an accepted pickup. */
  async schedulePickup(
    id: number,
    user: AuthUser,
    input: { scheduledDate: string; notes?: string | null }
  ): Promise<PickupRequest> {
    const row = await pickupRepository.findRequestById(id);
    if (!row) throw ApiError.notFound('Pickup request not found');
    if (row.producer_id !== user.userId) {
      throw ApiError.forbidden('Only the owner of the listing can schedule this pickup');
    }
    if (row.status !== 'ACCEPTED') {
      throw ApiError.badRequest('Only an accepted request can be scheduled');
    }
    if (row.pickup_id) throw ApiError.conflict('This pickup has already been scheduled');

    const scheduledDate = new Date(input.scheduledDate);
    if (Number.isNaN(scheduledDate.getTime())) throw ApiError.badRequest('Invalid scheduled date');

    const pickupId = await pickupRepository.createPickup(id, scheduledDate, input.notes ?? null);

    await eventBus.publish(EVENT.PICKUP_SCHEDULED, {
      pickupId,
      requestId: id,
      listingId: row.listing_id,
      collectorUserId: row.collector_user_id,
      producerId: row.producer_id,
      scheduledDate: scheduledDate.toISOString(),
      categoryName: row.category_name,
    });

    await logActivity({
      actorId: user.userId,
      actorRole: user.role,
      action: 'PICKUP_SCHEDULED',
      entityType: 'pickup',
      entityId: pickupId,
      description: `Scheduled pickup for request #${id}`,
    });

    const updated = await pickupRepository.findRequestById(id);
    if (!updated) throw ApiError.notFound('Pickup request not found');
    return toRequest(updated);
  },

  /**
   * COLLECTOR updates collection progress:
   *   SCHEDULED -> IN_PROGRESS -> COMPLETED
   * Completing the pickup marks the listing as COLLECTED.
   */
  async updatePickupStatus(
    requestId: number,
    user: AuthUser,
    status: PickupStatus
  ): Promise<PickupRequest> {
    const row = await pickupRepository.findRequestById(requestId);
    if (!row) throw ApiError.notFound('Pickup request not found');
    if (row.collector_user_id !== user.userId && user.role !== 'ADMIN') {
      throw ApiError.forbidden('Only the assigned collector can update this pickup');
    }
    if (!row.pickup_id) throw ApiError.badRequest('This pickup has not been scheduled yet');

    const allowed: Record<string, PickupStatus[]> = {
      SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };
    const current = row.pickup_status as PickupStatus;
    if (!allowed[current]?.includes(status)) {
      throw ApiError.badRequest(`Cannot change pickup status from ${current} to ${status}`);
    }

    await pickupRepository.updatePickupStatus(row.pickup_id, status);

    if (status === 'COMPLETED') {
      await listingRepository.updateStatus(row.listing_id, 'COLLECTED');
      await eventBus.publish(EVENT.COLLECTION_COMPLETED, {
        pickupId: row.pickup_id,
        requestId,
        listingId: row.listing_id,
        producerId: row.producer_id,
        collectorUserId: row.collector_user_id,
        categoryName: row.category_name,
      });
    }

    await logActivity({
      actorId: user.userId,
      actorRole: user.role,
      action: `PICKUP_${status}`,
      entityType: 'pickup',
      entityId: row.pickup_id,
      description: `Pickup #${row.pickup_id} marked ${status}`,
    });

    const updated = await pickupRepository.findRequestById(requestId);
    if (!updated) throw ApiError.notFound('Pickup request not found');
    return toRequest(updated);
  },

  /** Collection history for the logged-in user. */
  async history(user: AuthUser): Promise<PickupRequest[]> {
    let rows;
    if (user.role === 'COLLECTOR') {
      const collector = await collectorRepository.findByUserId(user.userId);
      if (!collector) throw ApiError.notFound('Collector profile not found');
      rows = await pickupRepository.listPickupsForCollector(collector.collector_id);
    } else if (user.role === 'WASTE_PRODUCER') {
      rows = await pickupRepository.listPickupsForProducer(user.userId);
    } else {
      rows = await pickupRepository.listAllRequests();
    }
    return rows.map(toRequest).filter((r) => r.pickup);
  },

  async listAll(): Promise<PickupRequest[]> {
    const rows = await pickupRepository.listAllRequests();
    return rows.map(toRequest);
  },
};
