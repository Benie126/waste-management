import { Request, Response } from 'express';
import { z } from 'zod';
import { pickupService } from '../services/pickup.service';
import { feedbackService } from '../services/feedback.service';
import { ApiError } from '../utils/ApiError';

export const createRequestSchema = z.object({
  listingId: z.coerce.number().int().positive('Listing is required'),
  message: z.string().trim().max(500).optional().nullable(),
});

export const scheduleSchema = z.object({
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updatePickupSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export const feedbackSchema = z.object({
  pickupId: z.coerce.number().int().positive('Pickup is required'),
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().trim().max(500).optional().nullable(),
});

export const pickupController = {
  async create(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const request = await pickupService.createRequest(req.user, req.body);
    res.status(201).json({ success: true, data: request });
  },

  async listForProducer(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const status = req.query.status as any;
    const requests = await pickupService.listForProducer(req.user.userId, status);
    res.json({ success: true, data: requests });
  },

  async listForCollector(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const status = req.query.status as any;
    const requests = await pickupService.listForCollector(req.user.userId, status);
    res.json({ success: true, data: requests });
  },

  async getOne(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const request = await pickupService.getRequest(Number(req.params.id), req.user);
    res.json({ success: true, data: request });
  },

  async accept(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const request = await pickupService.acceptRequest(Number(req.params.id), req.user);
    res.json({ success: true, data: request });
  },

  async reject(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const request = await pickupService.rejectRequest(Number(req.params.id), req.user);
    res.json({ success: true, data: request });
  },

  async schedule(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const request = await pickupService.schedulePickup(Number(req.params.id), req.user, req.body);
    res.json({ success: true, data: request });
  },

  async updateStatus(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const request = await pickupService.updatePickupStatus(Number(req.params.id), req.user, req.body.status);
    res.json({ success: true, data: request });
  },

  async history(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const history = await pickupService.history(req.user);
    res.json({ success: true, data: history });
  },
};

export const feedbackController = {
  async create(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const feedback = await feedbackService.create(req.user, req.body);
    res.status(201).json({ success: true, data: feedback });
  },

  async listForPickup(req: Request, res: Response) {
    const feedback = await feedbackService.listForPickup(Number(req.params.pickupId));
    res.json({ success: true, data: feedback });
  },
};
