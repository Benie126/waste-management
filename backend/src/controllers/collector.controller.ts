import { Request, Response } from 'express';
import { z } from 'zod';
import { collectorService } from '../services/collector.service';
import { ApiError } from '../utils/ApiError';

export const updateCollectorSchema = z.object({
  serviceArea: z.string().trim().min(2, 'Service area is required').max(190).optional(),
  availability: z.enum(['AVAILABLE', 'UNAVAILABLE']).optional(),
  acceptedMaterials: z.array(z.string().trim().min(1)).max(20).optional(),
  vehicleType: z.string().trim().max(80).optional().nullable(),
  bio: z.string().trim().max(500).optional().nullable(),
});

export const collectorController = {
  async me(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const profile = await collectorService.getProfile(req.user.userId);
    res.json({ success: true, data: profile });
  },

  async updateMe(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const profile = await collectorService.updateProfile(req.user.userId, req.body);
    res.json({ success: true, data: profile });
  },

  async recommendations(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const matches = await collectorService.getRecommendations(req.user.userId);
    res.json({ success: true, data: matches });
  },
};
