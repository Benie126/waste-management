import { Router } from 'express';
import {
  listingController,
  createListingSchema,
  updateListingSchema,
  listingFilterSchema,
} from '../controllers/listing.controller';
import { validateBody, validateQuery } from '../utils/validation';
import { asyncHandler } from '../utils/ApiError';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Producers manage their own listings.
router.post(
  '/',
  authorize('WASTE_PRODUCER'),
  validateBody(createListingSchema),
  asyncHandler(listingController.create)
);
router.get('/mine', authorize('WASTE_PRODUCER'), asyncHandler(listingController.listMine));

// Collectors (and orgs, for visibility) browse available waste.
router.get(
  '/available',
  authorize('COLLECTOR', 'RECYCLING_ORGANIZATION', 'ADMIN'),
  validateQuery(listingFilterSchema),
  asyncHandler(listingController.listAvailable)
);

router.get('/:id', asyncHandler(listingController.getOne));
router.put(
  '/:id',
  authorize('WASTE_PRODUCER', 'ADMIN'),
  validateBody(updateListingSchema),
  asyncHandler(listingController.update)
);
router.patch('/:id/cancel', authorize('WASTE_PRODUCER', 'ADMIN'), asyncHandler(listingController.cancel));
router.delete('/:id', authorize('WASTE_PRODUCER', 'ADMIN'), asyncHandler(listingController.remove));

export default router;
