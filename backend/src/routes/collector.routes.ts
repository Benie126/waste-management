import { Router } from 'express';
import { collectorController, updateCollectorSchema } from '../controllers/collector.controller';
import { validateBody } from '../utils/validation';
import { asyncHandler } from '../utils/ApiError';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorize('COLLECTOR'));

router.get('/me', asyncHandler(collectorController.me));
router.put('/me', validateBody(updateCollectorSchema), asyncHandler(collectorController.updateMe));
router.get('/recommendations', asyncHandler(collectorController.recommendations));

export default router;
