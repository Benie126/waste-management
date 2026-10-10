import { Router } from 'express';
import {
  authController,
  registerSchema,
  loginSchema,
  googleSchema,
  updateProfileSchema,
} from '../controllers/auth.controller';
import { validateBody } from '../utils/validation';
import { asyncHandler } from '../utils/ApiError';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', validateBody(registerSchema), asyncHandler(authController.register));
router.post('/login', validateBody(loginSchema), asyncHandler(authController.login));
router.post('/google', validateBody(googleSchema), asyncHandler(authController.google));
router.get('/me', authenticate, asyncHandler(authController.me));
router.put('/profile', authenticate, validateBody(updateProfileSchema), asyncHandler(authController.updateProfile));
router.post('/logout', authenticate, asyncHandler(authController.logout));

export default router;
