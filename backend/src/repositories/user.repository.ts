import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { execute, query, queryOne } from '../config/db.mysql';
import { Role } from '../types';

export interface UserRow extends RowDataPacket {
  user_id: number;
  name: string;
  email: string;
  password: string | null;
  phone: string | null;
  role: Role;
  google_id: string | null;
  avatar_url: string | null;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    avatarUrl: row.avatar_url,
    isActive: !!row.is_active,
    createdAt: row.created_at,
  };
}

export const userRepository = {
  async findByEmail(email: string): Promise<UserRow | null> {
    return queryOne<UserRow>('SELECT * FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
  },

  async findById(id: number): Promise<UserRow | null> {
    return queryOne<UserRow>('SELECT * FROM users WHERE user_id = ? LIMIT 1', [id]);
  },

  async findByGoogleId(googleId: string): Promise<UserRow | null> {
    return queryOne<UserRow>('SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId]);
  },

  async create(input: {
    name: string;
    email: string;
    password: string | null;
    phone?: string | null;
    role: Role;
    googleId?: string | null;
    avatarUrl?: string | null;
  }): Promise<number> {
    const result: ResultSetHeader = await execute(
      `INSERT INTO users (name, email, password, phone, role, google_id, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.email.toLowerCase(),
        input.password,
        input.phone ?? null,
        input.role,
        input.googleId ?? null,
        input.avatarUrl ?? null,
      ]
    );
    return result.insertId;
  },

  async updateProfile(
    id: number,
    input: { name?: string; phone?: string | null; password?: string; avatarUrl?: string | null }
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (input.name !== undefined) {
      fields.push('name = ?');
      values.push(input.name);
    }
    if (input.phone !== undefined) {
      fields.push('phone = ?');
      values.push(input.phone);
    }
    if (input.password !== undefined) {
      fields.push('password = ?');
      values.push(input.password);
    }
    if (input.avatarUrl !== undefined) {
      fields.push('avatar_url = ?');
      values.push(input.avatarUrl);
    }
    if (!fields.length) return;
    values.push(id);
    await execute(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, values);
  },

  async setActive(id: number, active: boolean): Promise<void> {
    await execute('UPDATE users SET is_active = ? WHERE user_id = ?', [active ? 1 : 0, id]);
  },

  async listAll(filters: { role?: Role; search?: string } = {}): Promise<UserRow[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filters.role) {
      where.push('role = ?');
      params.push(filters.role);
    }
    if (filters.search) {
      where.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    const sql = `SELECT * FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
    return query<UserRow[]>(sql, params);
  },

  async countByRole(): Promise<Record<string, number>> {
    const rows = await query<(RowDataPacket & { role: string; total: number })[]>(
      'SELECT role, COUNT(*) AS total FROM users GROUP BY role'
    );
    const out: Record<string, number> = {};
    for (const r of rows) out[r.role] = Number(r.total);
    return out;
  },
};
