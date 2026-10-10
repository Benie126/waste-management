import { NotificationModel, NotificationType } from '../models/mongo/Notification';
import { mongoReady } from '../config/db.mongo';

interface CreateNotificationInput {
  userId: number;
  message: string;
  type: NotificationType;
  meta?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (!mongoReady()) {
    console.warn('[notification] Mongo unavailable, skipping notification:', input.message);
    return;
  }
  try {
    await NotificationModel.create({
      userId: input.userId,
      message: input.message,
      type: input.type,
      read: false,
      meta: input.meta ?? {},
    });
  } catch (err) {
    console.warn('[notification] failed to create:', (err as Error).message);
  }
}

export async function listNotifications(userId: number, limit = 50) {
  if (!mongoReady()) return [];
  return NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
}

export async function countUnread(userId: number): Promise<number> {
  if (!mongoReady()) return 0;
  return NotificationModel.countDocuments({ userId, read: false });
}

export async function markRead(userId: number, id: string): Promise<void> {
  if (!mongoReady()) return;
  await NotificationModel.updateOne({ _id: id, userId }, { $set: { read: true } });
}

export async function markAllRead(userId: number): Promise<void> {
  if (!mongoReady()) return;
  await NotificationModel.updateMany({ userId, read: false }, { $set: { read: true } });
}
