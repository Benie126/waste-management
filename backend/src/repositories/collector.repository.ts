import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { execute, query, queryOne } from '../config/db.mysql';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type Availability = 'AVAILABLE' | 'UNAVAILABLE';

export interface CollectorRow extends RowDataPacket {
  collector_id: number;
  user_id: number;
  service_area: string;
  availability: Availability;
  accepted_materials: string[] | string | null;
  vehicle_type: string | null;
  bio: string | null;
  verification_status: VerificationStatus;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
  name: string;
  email: string;
  phone: string | null;
}

export interface CollectorProfile {
  collectorId: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  serviceArea: string;
  availability: Availability;
  acceptedMaterials: string[];
  vehicleType: string | null;
  bio: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt: Date | null;
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

export function toCollector(row: CollectorRow): CollectorProfile {
  return {
    collectorId: row.collector_id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    serviceArea: row.service_area,
    availability: row.availability,
    acceptedMaterials: parseMaterials(row.accepted_materials),
    vehicleType: row.vehicle_type,
    bio: row.bio,
    verificationStatus: row.verification_status,
    verifiedAt: row.verified_at,
  };
}

const SELECT = `
  SELECT cp.*, u.name, u.email, u.phone
  FROM collector_profiles cp
  JOIN users u ON u.user_id = cp.user_id
`;

export const collectorRepository = {
  async findByUserId(userId: number): Promise<CollectorRow | null> {
    return queryOne<CollectorRow>(`${SELECT} WHERE cp.user_id = ? LIMIT 1`, [userId]);
  },

  async findById(collectorId: number): Promise<CollectorRow | null> {
    return queryOne<CollectorRow>(`${SELECT} WHERE cp.collector_id = ? LIMIT 1`, [collectorId]);
  },

  async list(filters: { verificationStatus?: VerificationStatus } = {}): Promise<CollectorRow[]> {
    const where = filters.verificationStatus ? 'WHERE cp.verification_status = ?' : '';
    return query<CollectorRow[]>(
      `${SELECT} ${where} ORDER BY cp.created_at DESC`,
      filters.verificationStatus ? [filters.verificationStatus] : []
    );
  },

  async upsertProfile(
    userId: number,
    input: {
      serviceArea?: string;
      availability?: Availability;
      acceptedMaterials?: string[];
      vehicleType?: string | null;
      bio?: string | null;
    }
  ): Promise<void> {
    const existing = await this.findByUserId(userId);
    if (!existing) {
      const r: ResultSetHeader = await execute(
        `INSERT INTO collector_profiles (user_id, service_area, availability, accepted_materials, vehicle_type, bio)
         VALUES (?, ?, ?, CAST(? AS JSON), ?, ?)`,
        [
          userId,
          input.serviceArea ?? '',
          input.availability ?? 'AVAILABLE',
          JSON.stringify(input.acceptedMaterials ?? []),
          input.vehicleType ?? null,
          input.bio ?? null,
        ]
      );
      if (!r.insertId) throw new Error('Failed to create collector profile');
      return;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    if (input.serviceArea !== undefined) {
      fields.push('service_area = ?');
      values.push(input.serviceArea);
    }
    if (input.availability !== undefined) {
      fields.push('availability = ?');
      values.push(input.availability);
    }
    if (input.acceptedMaterials !== undefined) {
      fields.push('accepted_materials = CAST(? AS JSON)');
      values.push(JSON.stringify(input.acceptedMaterials));
    }
    if (input.vehicleType !== undefined) {
      fields.push('vehicle_type = ?');
      values.push(input.vehicleType);
    }
    if (input.bio !== undefined) {
      fields.push('bio = ?');
      values.push(input.bio);
    }
    if (!fields.length) return;
    values.push(userId);
    await execute(`UPDATE collector_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
  },

  async setVerification(userId: number, status: VerificationStatus): Promise<void> {
    await execute(
      `UPDATE collector_profiles
       SET verification_status = ?, verified_at = CASE WHEN ? = 'VERIFIED' THEN NOW() ELSE NULL END
       WHERE user_id = ?`,
      [status, status, userId]
    );
  },
};
