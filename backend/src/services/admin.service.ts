import { ApiError } from '../utils/ApiError';
import { userRepository, toPublicUser } from '../repositories/user.repository';
import { listingRepository, toListing } from '../repositories/listing.repository';
import { pickupRepository, toRequest } from '../repositories/pickup.repository';
import { categoryRepository, toCategory } from '../repositories/category.repository';
import { collectorRepository, toCollector } from '../repositories/collector.repository';
import { collectorService } from './collector.service';
import { logActivity, listActivity } from './activityLog.service';
import { VerificationStatus } from '../repositories/collector.repository';
import { Role } from '../types';
import { eventBus, EVENT } from '../config/rabbitmq';

export const adminService = {
  async stats() {
    const [usersByRole, listingsByStatus, requestsByStatus, pickupsByStatus, totalListings] =
      await Promise.all([
        userRepository.countByRole(),
        listingRepository.countByStatus(),
        pickupRepository.countRequestsByStatus(),
        pickupRepository.countPickupsByStatus(),
        listingRepository.countAll(),
      ]);

    const totalUsers = Object.values(usersByRole).reduce((a, b) => a + b, 0);
    const collectors = await collectorRepository.list();
    const pendingVerifications = collectors.filter((c) => c.verification_status === 'PENDING').length;

    return {
      users: { total: totalUsers, byRole: usersByRole },
      listings: { total: totalListings, byStatus: listingsByStatus },
      pickupRequests: { byStatus: requestsByStatus },
      pickups: { byStatus: pickupsByStatus },
      collectors: {
        total: collectors.length,
        verified: collectors.filter((c) => c.verification_status === 'VERIFIED').length,
        pending: pendingVerifications,
      },
    };
  },

  async listUsers(filters: { role?: Role; search?: string }) {
    const rows = await userRepository.listAll(filters);
    return rows.map(toPublicUser);
  },

  async setUserActive(userId: number, active: boolean, actorId: number) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'ADMIN') throw ApiError.badRequest('Admin accounts cannot be deactivated');

    await userRepository.setActive(userId, active);
    await logActivity({
      actorId,
      actorRole: 'ADMIN',
      action: active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'user',
      entityId: userId,
      description: `${active ? 'Activated' : 'Deactivated'} ${user.email}`,
    });
    const updated = await userRepository.findById(userId);
    return toPublicUser(updated!);
  },

  async listCollectors(status?: VerificationStatus) {
    const rows = await collectorRepository.list({ verificationStatus: status });
    return rows.map(toCollector);
  },

  async verifyCollector(userId: number, status: VerificationStatus, actorId: number) {
    const profile = await collectorService.setVerification(userId, status);
    await eventBus.publish(EVENT.COLLECTOR_VERIFIED, { userId, status });
    await logActivity({
      actorId,
      actorRole: 'ADMIN',
      action: 'COLLECTOR_VERIFICATION',
      entityType: 'collector_profile',
      entityId: profile.collectorId,
      description: `Collector ${profile.email} set to ${status}`,
    });
    return profile;
  },

  async listListings() {
    const rows = await listingRepository.list({}, 300, 0);
    return rows.map(toListing);
  },

  async listCategories() {
    const rows = await categoryRepository.listAll();
    return rows.map(toCategory);
  },

  async createCategory(name: string, description: string | null, actorId: number) {
    const existing = await categoryRepository.findByName(name);
    if (existing) throw ApiError.conflict('A category with this name already exists');
    const id = await categoryRepository.create(name, description);
    await logActivity({
      actorId,
      actorRole: 'ADMIN',
      action: 'CATEGORY_CREATED',
      entityType: 'waste_category',
      entityId: id,
      description: `Created category ${name}`,
    });
    const row = await categoryRepository.findById(id);
    return toCategory(row!);
  },

  async updateCategory(id: number, name: string, description: string | null, actorId: number) {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw ApiError.notFound('Category not found');
    const duplicate = await categoryRepository.findByName(name);
    if (duplicate && duplicate.category_id !== id) {
      throw ApiError.conflict('A category with this name already exists');
    }
    await categoryRepository.update(id, name, description);
    await logActivity({
      actorId,
      actorRole: 'ADMIN',
      action: 'CATEGORY_UPDATED',
      entityType: 'waste_category',
      entityId: id,
      description: `Updated category ${name}`,
    });
    const row = await categoryRepository.findById(id);
    return toCategory(row!);
  },

  async deleteCategory(id: number, actorId: number) {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw ApiError.notFound('Category not found');
    const used = await categoryRepository.countListings(id);
    if (used > 0) {
      throw ApiError.badRequest(
        `This category is used by ${used} listing(s) and cannot be deleted. Remove those listings first.`
      );
    }
    await categoryRepository.remove(id);
    await logActivity({
      actorId,
      actorRole: 'ADMIN',
      action: 'CATEGORY_DELETED',
      entityType: 'waste_category',
      entityId: id,
      description: `Deleted category ${existing.category_name}`,
    });
  },

  async listPickupActivities() {
    const rows = await pickupRepository.listAllRequests();
    return rows.map(toRequest);
  },

  async activities(limit: number) {
    return listActivity(limit);
  },
};
