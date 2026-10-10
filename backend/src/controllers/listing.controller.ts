import { Request, Response } from 'express';
import { z } from 'zod';
import { listingService } from '../services/listing.service';
import { ApiError } from '../utils/ApiError';

export const createListingSchema = z.object({
  categoryId: z.coerce.number().int().positive('Category is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0').max(1000000),
  unit: z.enum(['kg', 'tonnes', 'pieces', 'bags']).default('kg'),
  location: z.string().trim().min(2, 'Location is required').max(190),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const updateListingSchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  quantity: z.coerce.number().positive().max(1000000).optional(),
  unit: z.enum(['kg', 'tonnes', 'pieces', 'bags']).optional(),
  location: z.string().trim().min(2).max(190).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const listingFilterSchema = z.object({
  status: z.enum(['AVAILABLE', 'REQUESTED', 'SCHEDULED', 'COLLECTED', 'CANCELLED']).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  location: z.string().trim().optional(),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const listingController = {
  async create(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listing = await listingService.create(req.user.userId, req.body);
    res.status(201).json({ success: true, data: listing });
  },

  async listMine(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listings = await listingService.listMine(req.user.userId, req.query as any);
    res.json({ success: true, data: listings });
  },

  async listAvailable(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listings = await listingService.listAvailable(req.user.userId, req.query as any);
    res.json({ success: true, data: listings });
  },

  async getOne(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listing = await listingService.getOne(Number(req.params.id), req.user);
    res.json({ success: true, data: listing });
  },

  async update(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listing = await listingService.update(Number(req.params.id), req.user, req.body);
    res.json({ success: true, data: listing });
  },

  async cancel(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listing = await listingService.cancel(Number(req.params.id), req.user);
    res.json({ success: true, data: listing });
  },

  async remove(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await listingService.remove(Number(req.params.id), req.user);
    res.json({ success: true, message: 'Listing deleted' });
  },
};
