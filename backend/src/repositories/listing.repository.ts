import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { execute, query, queryOne } from '../config/db.mysql';

export type ListingStatus = 'AVAILABLE' | 'REQUESTED' | 'SCHEDULED' | 'COLLECTED' | 'CANCELLED';

export interface ListingRow extends RowDataPacket {
  listing_id: number;
  user_id: number;
  category_id: number;
  quantity: string | number;
  unit: string;
  location: string;
  description: string | null;
  status: ListingStatus;
  created_at: Date;
  updated_at: Date;
  category_name: string;
  producer_name: string;
  producer_email: string;
}

export interface Listing {
  listingId: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  quantity: number;
  unit: string;
  location: string;
  description: string | null;
  status: ListingStatus;
  producerName: string;
  producerEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toListing(row: ListingRow): Listing {
  return {
    listingId: row.listing_id,
    userId: row.user_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    location: row.location,
    description: row.description,
    status: row.status,
    producerName: row.producer_name,
    producerEmail: row.producer_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BASE_SELECT = `
  SELECT l.*, c.category_name, u.name AS producer_name, u.email AS producer_email
  FROM waste_listings l
  JOIN waste_categories c ON c.category_id = l.category_id
  JOIN users u ON u.user_id = l.user_id
`;

export interface ListingFilters {
  status?: ListingStatus;
  categoryId?: number;
  location?: string;
  search?: string;
  userId?: number;
  excludeUserId?: number;
}

export const listingRepository = {
  async findById(id: number): Promise<ListingRow | null> {
    return queryOne<ListingRow>(`${BASE_SELECT} WHERE l.listing_id = ? LIMIT 1`, [id]);
  },

  async list(filters: ListingFilters = {}, limit = 100, offset = 0): Promise<ListingRow[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.status) {
      where.push('l.status = ?');
      params.push(filters.status);
    }
    if (filters.categoryId) {
      where.push('l.category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.location) {
      where.push('l.location LIKE ?');
      params.push(`%${filters.location}%`);
    }
    if (filters.search) {
      where.push('(l.description LIKE ? OR l.location LIKE ? OR c.category_name LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.userId) {
      where.push('l.user_id = ?');
      params.push(filters.userId);
    }
    if (filters.excludeUserId) {
      where.push('l.user_id <> ?');
      params.push(filters.excludeUserId);
    }
    const sql = `${BASE_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    return query<ListingRow[]>(sql, [...params, limit, offset]);
  },

  async create(input: {
    userId: number;
    categoryId: number;
    quantity: number;
    unit: string;
    location: string;
    description: string | null;
  }): Promise<number> {
    const r: ResultSetHeader = await execute(
      `INSERT INTO waste_listings (user_id, category_id, quantity, unit, location, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
      [input.userId, input.categoryId, input.quantity, input.unit, input.location, input.description]
    );
    return r.insertId;
  },

  async update(
    id: number,
    input: { categoryId?: number; quantity?: number; unit?: string; location?: string; description?: string | null }
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (input.categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(input.categoryId);
    }
    if (input.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(input.quantity);
    }
    if (input.unit !== undefined) {
      fields.push('unit = ?');
      values.push(input.unit);
    }
    if (input.location !== undefined) {
      fields.push('location = ?');
      values.push(input.location);
    }
    if (input.description !== undefined) {
      fields.push('description = ?');
      values.push(input.description);
    }
    if (!fields.length) return;
    values.push(id);
    await execute(`UPDATE waste_listings SET ${fields.join(', ')} WHERE listing_id = ?`, values);
  },

  async updateStatus(id: number, status: ListingStatus): Promise<void> {
    await execute('UPDATE waste_listings SET status = ? WHERE listing_id = ?', [status, id]);
  },

  async remove(id: number): Promise<void> {
    await execute('DELETE FROM waste_listings WHERE listing_id = ?', [id]);
  },

  async countByStatus(userId?: number): Promise<Record<string, number>> {
    const sql = userId
      ? 'SELECT status, COUNT(*) AS total FROM waste_listings WHERE user_id = ? GROUP BY status'
      : 'SELECT status, COUNT(*) AS total FROM waste_listings GROUP BY status';
    const rows = await query<(RowDataPacket & { status: string; total: number })[]>(
      sql,
      userId ? [userId] : []
    );
    const out: Record<string, number> = {};
    for (const r of rows) out[r.status] = Number(r.total);
    return out;
  },

  async countAll(): Promise<number> {
    const row = await queryOne<RowDataPacket & { total: number }>(
      'SELECT COUNT(*) AS total FROM waste_listings'
    );
    return Number(row?.total ?? 0);
  },
};
