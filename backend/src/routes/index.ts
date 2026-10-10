import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import listingRoutes from './listing.routes';
import collectorRoutes from './collector.routes';
import pickupRoutes from './pickup.routes';
import organizationRoutes from './organization.routes';
import adminRoutes from './admin.routes';
import notificationRoutes from './notification.routes';
import { asyncHandler } from '../utils/ApiError';
import { mongoReady } from '../config/db.mongo';
import { eventBus } from '../config/rabbitmq';
import { testMySqlConnection } from '../config/db.mysql';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      mysql: true,
      mongo: mongoReady() ? 'connected' : 'disconnected',
      rabbitmq: eventBus.transport,
      time: new Date().toISOString(),
    },
  });
});

router.get(
  '/health/full',
  asyncHandler(async (_req: Request, res: Response) => {
    let mysql = false;
    try {
      await testMySqlConnection();
      mysql = true;
    } catch {
      mysql = false;
    }
    res.json({
      success: true,
      data: { mysql, mongo: mongoReady(), rabbitmq: eventBus.transport },
    });
  })
);

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/listings', listingRoutes);
router.use('/collectors', collectorRoutes);
router.use('/pickups', pickupRoutes);
router.use('/organizations', organizationRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

export default router;
