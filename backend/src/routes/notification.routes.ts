import { Router } from 'express';
import { Request, Response } from 'express';
import { asyncHandler, ApiError } from '../utils/ApiError';
import { authenticate } from '../middleware/auth.middleware';
import { listNotifications, countUnread, markRead, markAllRead } from '../services/notification.service';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const [notifications, unread] = await Promise.all([
      listNotifications(req.user.userId, limit),
      countUnread(req.user.userId),
    ]);
    res.json({ success: true, data: { notifications, unread } });
  })
);

router.get(
  '/unread-count',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const unread = await countUnread(req.user.userId);
    res.json({ success: true, data: { unread } });
  })
);

router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await markRead(req.user.userId, req.params.id);
    res.json({ success: true, message: 'Notification marked as read' });
  })
);

router.patch(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await markAllRead(req.user.userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  })
);

export default router;
