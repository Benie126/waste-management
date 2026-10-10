import { Request, Response } from 'express';
import { z } from 'zod';
import { adminService } from '../services/admin.service';
import { ApiError } from '../utils/ApiError';

export const userFilterSchema = z.object({
  role: z.enum(['WASTE_PRODUCER', 'COLLECTOR', 'RECYCLING_ORGANIZATION', 'ADMIN']).optional(),
  search: z.string().trim().optional(),
});

export const verifySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'PENDING']),
});

export const activeSchema = z.object({
  isActive: z.boolean(),
});

export const categorySchema = z.object({
  categoryName: z.string().trim().min(2, 'Category name is required').max(80),
  description: z.string().trim().max(255).optional().nullable(),
});

export const adminController = {
  async stats(_req: Request, res: Response) {
    res.json({ success: true, data: await adminService.stats() });
  },

  async users(req: Request, res: Response) {
    const users = await adminService.listUsers(req.query as any);
    res.json({ success: true, data: users });
  },

  async setUserActive(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const user = await adminService.setUserActive(Number(req.params.id), req.body.isActive, req.user.userId);
    res.json({ success: true, data: user });
  },

  async collectors(req: Request, res: Response) {
    const status = req.query.status as any;
    const collectors = await adminService.listCollectors(status);
    res.json({ success: true, data: collectors });
  },

  async verifyCollector(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const profile = await adminService.verifyCollector(
      Number(req.params.id),
      req.body.status,
      req.user.userId
    );
    res.json({ success: true, data: profile });
  },

  async listings(_req: Request, res: Response) {
    res.json({ success: true, data: await adminService.listListings() });
  },

  async categories(_req: Request, res: Response) {
    res.json({ success: true, data: await adminService.listCategories() });
  },

  async createCategory(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const category = await adminService.createCategory(
      req.body.categoryName,
      req.body.description ?? null,
      req.user.userId
    );
    res.status(201).json({ success: true, data: category });
  },

  async updateCategory(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const category = await adminService.updateCategory(
      Number(req.params.id),
      req.body.categoryName,
      req.body.description ?? null,
      req.user.userId
    );
    res.json({ success: true, data: category });
  },

  async deleteCategory(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await adminService.deleteCategory(Number(req.params.id), req.user.userId);
    res.json({ success: true, message: 'Category deleted' });
  },

  async pickups(_req: Request, res: Response) {
    res.json({ success: true, data: await adminService.listPickupActivities() });
  },

  async activities(req: Request, res: Response) {
    const limit = Math.min(Number(req.query.limit ?? 100), 300);
    res.json({ success: true, data: await adminService.activities(limit) });
  },
};
