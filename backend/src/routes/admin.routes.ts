import { Router } from 'express';
import {
  adminController,
  userFilterSchema,
  verifySchema,
  activeSchema,
  categorySchema,
} from '../controllers/admin.controller';
import { validateBody, validateQuery } from '../utils/validation';
import { asyncHandler } from '../utils/ApiError';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Every admin route is behind ADMIN-only RBAC.
router.use(authenticate, authorize('ADMIN'));

router.get('/stats', asyncHandler(adminController.stats));

router.get('/users', validateQuery(userFilterSchema), asyncHandler(adminController.users));
router.patch('/users/:id/active', validateBody(activeSchema), asyncHandler(adminController.setUserActive));

router.get('/collectors', asyncHandler(adminController.collectors));
router.patch('/collectors/:id/verify', validateBody(verifySchema), asyncHandler(adminController.verifyCollector));

router.get('/listings', asyncHandler(adminController.listings));

router.get('/categories', asyncHandler(adminController.categories));
router.post('/categories', validateBody(categorySchema), asyncHandler(adminController.createCategory));
router.put('/categories/:id', validateBody(categorySchema), asyncHandler(adminController.updateCategory));
router.delete('/categories/:id', asyncHandler(adminController.deleteCategory));

router.get('/pickups', asyncHandler(adminController.pickups));
router.get('/activities', asyncHandler(adminController.activities));

export default router;
