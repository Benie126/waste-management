import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('A valid email is required').max(190),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(['WASTE_PRODUCER', 'COLLECTOR', 'RECYCLING_ORGANIZATION']),
});

export const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const googleSchema = z.object({
  idToken: z.string().min(10, 'Google id token is required'),
  role: z.enum(['WASTE_PRODUCER', 'COLLECTOR', 'RECYCLING_ORGANIZATION']).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(6).max(100).optional(),
});

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  },

  async google(req: Request, res: Response) {
    const { idToken, role } = req.body;
    const result = await authService.loginWithGoogle(idToken, role);
    res.json({ success: true, data: result });
  },

  async me(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const user = await authService.me(req.user.userId);
    res.json({ success: true, data: user });
  },

  async updateProfile(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const user = await authService.updateProfile(req.user.userId, req.body);
    res.json({ success: true, data: user });
  },

  async logout(_req: Request, res: Response) {
    // JWT is stateless: the client discards the token. Endpoint kept so the UI
    // has an explicit server call and future token blacklisting has a home.
    res.json({ success: true, message: 'Logged out' });
  },
};
