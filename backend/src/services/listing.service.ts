import { ApiError } from '../utils/ApiError';
import {
  listingRepository,
  toListing,
  Listing,
  ListingStatus,
} from '../repositories/listing.repository';
import { categoryRepository } from '../repositories/category.repository';
import { AuthUser } from '../types';
import { logActivity } from './activityLog.service';
import { findMatchesForListing } from './matching.service';

export const listingService = {
  async create(
    userId: number,
    input: {
      categoryId: number;
      quantity: number;
      unit: string;
      location: string;
      description?: string | null;
    }
  ): Promise<Listing & { matches: Awaited<ReturnType<typeof findMatchesForListing>> }> {
    const category = await categoryRepository.findById(input.categoryId);
    if (!category) throw ApiError.badRequest('Selected waste category does not exist');

    const id = await listingRepository.create({
      userId,
      categoryId: input.categoryId,
      quantity: input.quantity,
      unit: input.unit,
      location: input.location,
      description: input.description ?? null,
    });

    const row = await listingRepository.findById(id);
    if (!row) throw new ApiError(500, 'Failed to load created listing');

    await logActivity({
      actorId: userId,
      action: 'LISTING_CREATED',
      entityType: 'waste_listing',
      entityId: id,
      description: `Created ${category.category_name} listing at ${input.location}`,
    });

    // Smart matching runs immediately so the producer sees suitable collectors.
    const matches = await findMatchesForListing(id);

    return { ...toListing(row), matches };
  },

  async listMine(userId: number, filters: { status?: ListingStatus; categoryId?: number } = {}) {
    const rows = await listingRepository.list({ ...filters, userId });
    return rows.map(toListing);
  },

  /** Listings available for collectors: never the collector's own (n/a) and not closed. */
  async listAvailable(
    userId: number,
    filters: { status?: ListingStatus; categoryId?: number; location?: string; search?: string; limit?: number; offset?: number } = {}
  ) {
    const rows = await listingRepository.list(
      {
        categoryId: filters.categoryId,
        location: filters.location,
        search: filters.search,
        status: filters.status ?? 'AVAILABLE',
        excludeUserId: userId,
      },
      filters.limit ?? 100,
      filters.offset ?? 0
    );
    return rows.map(toListing);
  },

  async getOne(id: number, user: AuthUser): Promise<Listing> {
    const row = await listingRepository.findById(id);
    if (!row) throw ApiError.notFound('Listing not found');

    // A producer may only see their own listing details; other roles may view
    // listings that are part of the open marketplace.
    if (user.role === 'WASTE_PRODUCER' && row.user_id !== user.userId) {
      throw ApiError.forbidden('You can only view your own listings');
    }
    return toListing(row);
  },

  async update(
    id: number,
    user: AuthUser,
    input: { categoryId?: number; quantity?: number; unit?: string; location?: string; description?: string | null }
  ): Promise<Listing> {
    const row = await listingRepository.findById(id);
    if (!row) throw ApiError.notFound('Listing not found');
    if (row.user_id !== user.userId && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only edit your own listings');
    }
    if (['COLLECTED', 'CANCELLED'].includes(row.status)) {
      throw ApiError.badRequest(`A ${row.status.toLowerCase()} listing cannot be edited`);
    }
    if (input.categoryId) {
      const category = await categoryRepository.findById(input.categoryId);
      if (!category) throw ApiError.badRequest('Selected waste category does not exist');
    }

    await listingRepository.update(id, input);
    const updated = await listingRepository.findById(id);
    if (!updated) throw ApiError.notFound('Listing not found');

    await logActivity({
      actorId: user.userId,
      actorRole: user.role,
      action: 'LISTING_UPDATED',
      entityType: 'waste_listing',
      entityId: id,
      description: 'Listing updated',
    });

    return toListing(updated);
  },

  async cancel(id: number, user: AuthUser): Promise<Listing> {
    const row = await listingRepository.findById(id);
    if (!row) throw ApiError.notFound('Listing not found');
    if (row.user_id !== user.userId && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only cancel your own listings');
    }
    if (row.status === 'COLLECTED') throw ApiError.badRequest('A collected listing cannot be cancelled');

    await listingRepository.updateStatus(id, 'CANCELLED');
    const updated = await listingRepository.findById(id);
    if (!updated) throw ApiError.notFound('Listing not found');
    await logActivity({
      actorId: user.userId,
      actorRole: user.role,
      action: 'LISTING_CANCELLED',
      entityType: 'waste_listing',
      entityId: id,
      description: 'Listing cancelled',
    });
    return toListing(updated);
  },

  async remove(id: number, user: AuthUser): Promise<void> {
    const row = await listingRepository.findById(id);
    if (!row) throw ApiError.notFound('Listing not found');
    if (row.user_id !== user.userId && user.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only delete your own listings');
    }
    await listingRepository.remove(id);
    await logActivity({
      actorId: user.userId,
      actorRole: user.role,
      action: 'LISTING_DELETED',
      entityType: 'waste_listing',
      entityId: id,
      description: 'Listing deleted',
    });
  },
};
