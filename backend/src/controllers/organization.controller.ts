import { Request, Response } from 'express';
import { z } from 'zod';
import { organizationService } from '../services/organization.service';
import { ApiError } from '../utils/ApiError';

export const updateOrgSchema = z.object({
  organizationName: z.string().trim().min(2).max(190).optional(),
  address: z.string().trim().max(190).optional().nullable(),
  acceptedMaterials: z.array(z.string().trim().min(1)).max(20).optional(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const organizationController = {
  async me(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const profile = await organizationService.getProfile(req.user.userId);
    res.json({ success: true, data: profile });
  },

  async updateMe(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const profile = await organizationService.updateProfile(req.user.userId, req.body);
    res.json({ success: true, data: profile });
  },

  async relevantListings(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listings = await organizationService.relevantListings(req.user.userId);
    res.json({ success: true, data: listings });
  },

  async stats(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const stats = await organizationService.stats(req.user.userId);
    res.json({ success: true, data: stats });
  },
};
