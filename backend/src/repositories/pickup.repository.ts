import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { execute, query, queryOne } from '../config/db.mysql';

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export type PickupStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface RequestRow extends RowDataPacket {
  request_id: number;
  listing_id: number;
  collector_id: number;
  message: string | null;
  status: RequestStatus;
  created_at: Date;
  updated_at: Date;
  // joined
  category_name: string;
  quantity: string | number;
  unit: string;
  location: string;
  listing_status: string;
  producer_id: number;
  producer_name: string;
  producer_email: string;
  collector_user_id: number;
  collector_name: string;
  collector_email: string;
  // pickup (nullable)
  pickup_id: number | null;
  scheduled_date: Date | null;
  pickup_status: PickupStatus | null;
  completed_at: Date | null;
}

export interface PickupRequest {
  requestId: number;
  listingId: number;
  collectorId: number;
  message: string | null;
  status: RequestStatus;
  createdAt: Date;
  listing: {
    categoryName: string;
    quantity: number;
    unit: string;
    location: string;
    status: string;
    producerId: number;
    producerName: string;
    producerEmail: string;
  };
  collector: {
    collectorId: number;
    userId: number;
    name: string;
    email: string;
  };
  pickup: {
    pickupId: number;
    scheduledDate: Date;
    status: PickupStatus;
    completedAt: Date | null;
  } | null;
}

export function toRequest(row: RequestRow): PickupRequest {
  return {
    requestId: row.request_id,
    listingId: row.listing_id,
    collectorId: row.collector_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    listing: {
      categoryName: row.category_name,
      quantity: Number(row.quantity),
      unit: row.unit,
      location: row.location,
      status: row.listing_status,
      producerId: row.producer_id,
      producerName: row.producer_name,
      producerEmail: row.producer_email,
    },
    collector: {
      collectorId: row.collector_id,
      userId: row.collector_user_id,
      name: row.collector_name,
      email: row.collector_email,
    },
    pickup: row.pickup_id
      ? {
          pickupId: row.pickup_id,
          scheduledDate: row.scheduled_date as Date,
          status: row.pickup_status as PickupStatus,
          completedAt: row.completed_at,
        }
      : null,
  };
}

const SELECT = `
  SELECT pr.*,
         l.category_id, l.quantity, l.unit, l.location, l.status AS listing_status, l.user_id AS producer_id,
         c.category_name,
         pu.name AS producer_name, pu.email AS producer_email,
         cu.user_id AS collector_user_id, cu.name AS collector_name, cu.email AS collector_email,
         pk.pickup_id, pk.scheduled_date, pk.status AS pickup_status, pk.completed_at
  FROM pickup_requests pr
  JOIN waste_listings l ON l.listing_id = pr.listing_id
  JOIN waste_categories c ON c.category_id = l.category_id
  JOIN users pu ON pu.user_id = l.user_id
  JOIN collector_profiles cp ON cp.collector_id = pr.collector_id
  JOIN users cu ON cu.user_id = cp.user_id
  LEFT JOIN pickups pk ON pk.request_id = pr.request_id
`;

export const pickupRepository = {
  async findRequestById(id: number): Promise<RequestRow | null> {
    return queryOne<RequestRow>(`${SELECT} WHERE pr.request_id = ? LIMIT 1`, [id]);
  },

  async findRequestByListingAndCollector(listingId: number, collectorId: number): Promise<RequestRow | null> {
    return queryOne<RequestRow>(
      `${SELECT} WHERE pr.listing_id = ? AND pr.collector_id = ? LIMIT 1`,
      [listingId, collectorId]
    );
  },

  async listRequestsForProducer(producerId: number, status?: RequestStatus): Promise<RequestRow[]> {
    const where = ['l.user_id = ?'];
    const params: unknown[] = [producerId];
    if (status) {
      where.push('pr.status = ?');
      params.push(status);
    }
    return query<RequestRow[]>(
      `${SELECT} WHERE ${where.join(' AND ')} ORDER BY pr.created_at DESC`,
      params
    );
  },

  async listRequestsForCollector(collectorId: number, status?: RequestStatus): Promise<RequestRow[]> {
    const where = ['pr.collector_id = ?'];
    const params: unknown[] = [collectorId];
    if (status) {
      where.push('pr.status = ?');
      params.push(status);
    }
    return query<RequestRow[]>(
      `${SELECT} WHERE ${where.join(' AND ')} ORDER BY pr.created_at DESC`,
      params
    );
  },

  async listAllRequests(): Promise<RequestRow[]> {
    return query<RequestRow[]>(`${SELECT} ORDER BY pr.created_at DESC LIMIT 300`);
  },

  async createRequest(input: {
    listingId: number;
    collectorId: number;
    message: string | null;
  }): Promise<number> {
    const r: ResultSetHeader = await execute(
      `INSERT INTO pickup_requests (listing_id, collector_id, message, status)
       VALUES (?, ?, ?, 'PENDING')`,
      [input.listingId, input.collectorId, input.message]
    );
    return r.insertId;
  },

  async updateRequestStatus(id: number, status: RequestStatus): Promise<void> {
    await execute('UPDATE pickup_requests SET status = ? WHERE request_id = ?', [status, id]);
  },

  async createPickup(requestId: number, scheduledDate: Date, notes: string | null): Promise<number> {
    const r: ResultSetHeader = await execute(
      `INSERT INTO pickups (request_id, scheduled_date, status, notes)
       VALUES (?, ?, 'SCHEDULED', ?)`,
      [requestId, scheduledDate, notes]
    );
    return r.insertId;
  },

  async updatePickupStatus(pickupId: number, status: PickupStatus): Promise<void> {
    await execute(
      `UPDATE pickups
       SET status = ?, completed_at = CASE WHEN ? = 'COMPLETED' THEN NOW() ELSE completed_at END
       WHERE pickup_id = ?`,
      [status, status, pickupId]
    );
  },

  async findPickupById(pickupId: number): Promise<RowDataPacket | null> {
    return queryOne<RowDataPacket>('SELECT * FROM pickups WHERE pickup_id = ?', [pickupId]);
  },

  async listPickupsForCollector(collectorId: number): Promise<RequestRow[]> {
    return query<RequestRow[]>(
      `${SELECT} WHERE pr.collector_id = ? AND pk.pickup_id IS NOT NULL ORDER BY pk.scheduled_date DESC`,
      [collectorId]
    );
  },

  async listPickupsForProducer(producerId: number): Promise<RequestRow[]> {
    return query<RequestRow[]>(
      `${SELECT} WHERE l.user_id = ? AND pk.pickup_id IS NOT NULL ORDER BY pk.scheduled_date DESC`,
      [producerId]
    );
  },

  async countRequestsByStatus(collectorId?: number): Promise<Record<string, number>> {
    const sql = collectorId
      ? 'SELECT status, COUNT(*) AS total FROM pickup_requests WHERE collector_id = ? GROUP BY status'
      : 'SELECT status, COUNT(*) AS total FROM pickup_requests GROUP BY status';
    const rows = await query<(RowDataPacket & { status: string; total: number })[]>(
      sql,
      collectorId ? [collectorId] : []
    );
    const out: Record<string, number> = {};
    for (const r of rows) out[r.status] = Number(r.total);
    return out;
  },

  async countPickupsByStatus(): Promise<Record<string, number>> {
    const rows = await query<(RowDataPacket & { status: string; total: number })[]>(
      'SELECT status, COUNT(*) AS total FROM pickups GROUP BY status'
    );
    const out: Record<string, number> = {};
    for (const r of rows) out[r.status] = Number(r.total);
    return out;
  },

  /** Accepted requests for a listing (used to close it once collected). */
  async countActiveRequests(listingId: number): Promise<number> {
    const row = await queryOne<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) AS total FROM pickup_requests
       WHERE listing_id = ? AND status IN ('PENDING','ACCEPTED')`,
      [listingId]
    );
    return Number(row?.total ?? 0);
  },
};
