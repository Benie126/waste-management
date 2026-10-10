import { ApiError } from '../utils/ApiError';
import {
  collectorRepository,
  toCollector,
  CollectorProfile,
  Availability,
  VerificationStatus,
} from '../repositories/collector.repository';
import { categoryRepository } from '../repositories/category.repository';
import { findMatchesForCollector } from './matching.service';
import { logActivity } from './activityLog.service';

async function validateMaterials(materials: string[]): Promise<string[]> {
  const categories = await categoryRepository.listAll();
  const names = categories.map((c) => c.category_name);
  const cleaned = Array.from(new Set(materials.map((m) => m.trim()).filter(Boolean)));
  const invalid = cleaned.filter((m) => !names.includes(m));
  if (invalid.length) {
    throw ApiError.badRequest(`Unknown waste material(s): ${invalid.join(', ')}`);
  }
  return cleaned;
}

export const collectorService = {
  async getProfile(userId: number): Promise<CollectorProfile> {
    const row = await collectorRepository.findByUserId(userId);
    if (!row) throw ApiError.notFound('Collector profile not found');
    return toCollector(row);
  },

  async updateProfile(
    userId: number,
    input: {
      serviceArea?: string;
      availability?: Availability;
      acceptedMaterials?: string[];
      vehicleType?: string | null;
      bio?: string | null;
    }
  ): Promise<CollectorProfile> {
    if (input.acceptedMaterials) {
      input.acceptedMaterials = await validateMaterials(input.acceptedMaterials);
    }
    await collectorRepository.upsertProfile(userId, input);
    const row = await collectorRepository.findByUserId(userId);
    if (!row) throw ApiError.notFound('Collector profile not found');

    await logActivity({
      actorId: userId,
      actorRole: 'COLLECTOR',
      action: 'COLLECTOR_PROFILE_UPDATED',
      entityType: 'collector_profile',
      entityId: row.collector_id,
      description: 'Collector profile updated',
    });

    return toCollector(row);
  },

  /** Verified collectors only: required before requesting pickups. */
  async assertVerified(userId: number): Promise<void> {
    const row = await collectorRepository.findByUserId(userId);
    if (!row) throw ApiError.forbidden('Collector profile not found');
    if (row.verification_status !== 'VERIFIED') {
      throw ApiError.forbidden(
        'Your collector account must be verified by an administrator before you can request pickups'
      );
    }
  },

  async getRecommendations(userId: number) {
    await this.assertVerified(userId);
    return findMatchesForCollector(userId, 20);
  },

  async listAll(status?: VerificationStatus): Promise<CollectorProfile[]> {
    const rows = await collectorRepository.list({ verificationStatus: status });
    return rows.map(toCollector);
  },

  async setVerification(userId: number, status: VerificationStatus): Promise<CollectorProfile> {
    const row = await collectorRepository.findByUserId(userId);
    if (!row) throw ApiError.notFound('Collector profile not found');
    await collectorRepository.setVerification(userId, status);
    const updated = await collectorRepository.findByUserId(userId);
    if (!updated) throw ApiError.notFound('Collector profile not found');
    return toCollector(updated);
  },
};
