import { Router } from 'express';
import { organizationController, updateOrgSchema } from '../controllers/organization.controller';
import { validateBody } from '../utils/validation';
import { asyncHandler } from '../utils/ApiError';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorize('RECYCLING_ORGANIZATION'));

router.get('/me', asyncHandler(organizationController.me));
router.put('/me', validateBody(updateOrgSchema), asyncHandler(organizationController.updateMe));
router.get('/listings', asyncHandler(organizationController.relevantListings));
router.get('/stats', asyncHandler(organizationController.stats));

export default router;
