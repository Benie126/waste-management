import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { execute, query, queryOne } from '../config/db.mysql';

export interface CategoryRow extends RowDataPacket {
  category_id: number;
  category_name: string;
  description: string | null;
  created_at: Date;
}

export interface Category {
  categoryId: number;
  categoryName: string;
  description: string | null;
}

export function toCategory(row: CategoryRow): Category {
  return {
    categoryId: row.category_id,
    categoryName: row.category_name,
    description: row.description,
  };
}

export const categoryRepository = {
  async listAll(): Promise<CategoryRow[]> {
    return query<CategoryRow[]>('SELECT * FROM waste_categories ORDER BY category_name ASC');
  },

  async findById(id: number): Promise<CategoryRow | null> {
    return queryOne<CategoryRow>('SELECT * FROM waste_categories WHERE category_id = ?', [id]);
  },

  async findByName(name: string): Promise<CategoryRow | null> {
    return queryOne<CategoryRow>('SELECT * FROM waste_categories WHERE category_name = ?', [name]);
  },

  async create(name: string, description: string | null): Promise<number> {
    const r: ResultSetHeader = await execute(
      'INSERT INTO waste_categories (category_name, description) VALUES (?, ?)',
      [name, description]
    );
    return r.insertId;
  },

  async update(id: number, name: string, description: string | null): Promise<void> {
    await execute('UPDATE waste_categories SET category_name = ?, description = ? WHERE category_id = ?', [
      name,
      description,
      id,
    ]);
  },

  async remove(id: number): Promise<void> {
    await execute('DELETE FROM waste_categories WHERE category_id = ?', [id]);
  },

  async countListings(id: number): Promise<number> {
    const row = await queryOne<RowDataPacket & { total: number }>(
      'SELECT COUNT(*) AS total FROM waste_listings WHERE category_id = ?',
      [id]
    );
    return Number(row?.total ?? 0);
  },
};
