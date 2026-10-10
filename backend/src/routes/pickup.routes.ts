import { Router } from 'express';
import {
  pickupController,
  feedbackController,
  createRequestSchema,
  scheduleSchema,
  updatePickupSchema,
  feedbackSchema,
} from '../controllers/pickup.controller';
import { validateBody } from '../utils/validation';
import { asyncHandler } from '../utils/ApiError';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Collector creates and views requests
router.post(
  '/requests',
  authorize('COLLECTOR'),
  validateBody(createRequestSchema),
  asyncHandler(pickupController.create)
);
router.get('/requests/collector', authorize('COLLECTOR'), asyncHandler(pickupController.listForCollector));
router.get('/requests/producer', authorize('WASTE_PRODUCER'), asyncHandler(pickupController.listForProducer));
router.get('/requests/:id', asyncHandler(pickupController.getOne));

// Producer decisions + scheduling
router.patch('/requests/:id/accept', authorize('WASTE_PRODUCER'), asyncHandler(pickupController.accept));
router.patch('/requests/:id/reject', authorize('WASTE_PRODUCER'), asyncHandler(pickupController.reject));
router.post(
  '/requests/:id/schedule',
  authorize('WASTE_PRODUCER'),
  validateBody(scheduleSchema),
  asyncHandler(pickupController.schedule)
);

// Collector collection tracking
router.patch(
  '/requests/:id/status',
  authorize('COLLECTOR', 'ADMIN'),
  validateBody(updatePickupSchema),
  asyncHandler(pickupController.updateStatus)
);

// Shared
router.get('/history', asyncHandler(pickupController.history));

// Feedback (producer)
router.post('/feedback', authorize('WASTE_PRODUCER'), validateBody(feedbackSchema), asyncHandler(feedbackController.create));
router.get('/feedback/:pickupId', asyncHandler(feedbackController.listForPickup));

export default router;
