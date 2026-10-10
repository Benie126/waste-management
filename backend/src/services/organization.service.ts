import { RowDataPacket } from 'mysql2';
import { execute, query, queryOne } from '../config/db.mysql';
import { ApiError } from '../utils/ApiError';
import { categoryRepository } from '../repositories/category.repository';
import { toListing, ListingRow } from '../repositories/listing.repository';
import { logActivity } from './activityLog.service';

export interface OrganizationProfile {
  orgId: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  organizationName: string;
  address: string | null;
  acceptedMaterials: string[];
  description: string | null;
}

interface OrgRow extends RowDataPacket {
  org_id: number;
  user_id: number;
  organization_name: string;
  address: string | null;
  accepted_materials: string[] | string | null;
  description: string | null;
  name: string;
  email: string;
  phone: string | null;
}

function parseMaterials(value: string[] | string | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toOrg(row: OrgRow): OrganizationProfile {
  return {
    orgId: row.org_id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    organizationName: row.organization_name,
    address: row.address,
    acceptedMaterials: parseMaterials(row.accepted_materials),
    description: row.description,
  };
}

const SELECT = `
  SELECT op.*, u.name, u.email, u.phone
  FROM organization_profiles op
  JOIN users u ON u.user_id = op.user_id
`;

async function ensureProfile(userId: number): Promise<OrgRow> {
  let row = await queryOne<OrgRow>(`${SELECT} WHERE op.user_id = ? LIMIT 1`, [userId]);
  if (!row) {
    const user = await queryOne<RowDataPacket & { name: string }>(
      'SELECT name FROM users WHERE user_id = ?',
      [userId]
    );
    await execute(
      `INSERT INTO organization_profiles (user_id, organization_name, accepted_materials)
       VALUES (?, ?, JSON_ARRAY())`,
      [userId, user?.name ?? 'Organization']
    );
    row = await queryOne<OrgRow>(`${SELECT} WHERE op.user_id = ? LIMIT 1`, [userId]);
  }
  if (!row) throw ApiError.notFound('Organization profile not found');
  return row;
}

export const organizationService = {
  async getProfile(userId: number): Promise<OrganizationProfile> {
    return toOrg(await ensureProfile(userId));
  },

  async updateProfile(
    userId: number,
    input: {
      organizationName?: string;
      address?: string | null;
      acceptedMaterials?: string[];
      description?: string | null;
    }
  ): Promise<OrganizationProfile> {
    if (input.acceptedMaterials) {
      const categories = await categoryRepository.listAll();
      const names = categories.map((c) => c.category_name);
      const invalid = input.acceptedMaterials.filter((m) => !names.includes(m));
      if (invalid.length) throw ApiError.badRequest(`Unknown waste material(s): ${invalid.join(', ')}`);
    }

    await ensureProfile(userId);

    const fields: string[] = [];
    const values: unknown[] = [];
    if (input.organizationName !== undefined) {
      fields.push('organization_name = ?');
      values.push(input.organizationName);
    }
    if (input.address !== undefined) {
      fields.push('address = ?');
      values.push(input.address);
    }
    if (input.acceptedMaterials !== undefined) {
      fields.push('accepted_materials = CAST(? AS JSON)');
      values.push(JSON.stringify(input.acceptedMaterials));
    }
    if (input.description !== undefined) {
      fields.push('description = ?');
      values.push(input.description);
    }
    if (fields.length) {
      values.push(userId);
      await execute(`UPDATE organization_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
    }

    await logActivity({
      actorId: userId,
      actorRole: 'RECYCLING_ORGANIZATION',
      action: 'ORG_PROFILE_UPDATED',
      entityType: 'organization_profile',
      entityId: userId,
      description: 'Organization profile updated',
    });

    return toOrg(await ensureProfile(userId));
  },

  /** Waste relevant to the organization = listings whose category it accepts. */
  async relevantListings(userId: number) {
    const profile = await this.getProfile(userId);
    if (!profile.acceptedMaterials.length) return [];

    const placeholders = profile.acceptedMaterials.map(() => '?').join(',');
    const rows = await query<ListingRow[]>(
      `SELECT l.*, c.category_name, u.name AS producer_name, u.email AS producer_email
       FROM waste_listings l
       JOIN waste_categories c ON c.category_id = l.category_id
       JOIN users u ON u.user_id = l.user_id
       WHERE c.category_name IN (${placeholders})
       ORDER BY l.created_at DESC LIMIT 100`,
      profile.acceptedMaterials
    );
    // Map to the shared camelCase shape the frontend expects (not raw SQL rows).
    return rows.map(toListing);
  },

  async stats(userId: number) {
    const profile = await this.getProfile(userId);
    if (!profile.acceptedMaterials.length) {
      return { acceptedMaterials: 0, relevantListings: 0, availableListings: 0 };
    }
    const placeholders = profile.acceptedMaterials.map(() => '?').join(',');
    const row = await queryOne<RowDataPacket & { total: number; available: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN l.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available
       FROM waste_listings l
       JOIN waste_categories c ON c.category_id = l.category_id
       WHERE c.category_name IN (${placeholders})`,
      profile.acceptedMaterials
    );
    return {
      acceptedMaterials: profile.acceptedMaterials.length,
      relevantListings: Number(row?.total ?? 0),
      availableListings: Number(row?.available ?? 0),
    };
  },
};
