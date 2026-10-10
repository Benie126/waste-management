import { Schema, model, Document } from 'mongoose';

export type NotificationType =
  | 'PICKUP_REQUESTED'
  | 'PICKUP_ACCEPTED'
  | 'PICKUP_REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'COLLECTION_COMPLETED'
  | 'COLLECTOR_VERIFIED'
  | 'SYSTEM';

export interface NotificationDoc extends Document {
  userId: number;
  message: string;
  type: NotificationType;
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    userId: { type: Number, required: true, index: true },
    message: { type: String, required: true },
    type: { type: String, required: true, default: 'SYSTEM' },
    read: { type: Boolean, default: false, index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'notifications' }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel = model<NotificationDoc>('Notification', notificationSchema);
