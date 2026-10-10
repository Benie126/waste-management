import { Schema, model, Document } from 'mongoose';

export interface ActivityLogDoc extends Document {
  actorId: number | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: number | string | null;
  description: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<ActivityLogDoc>(
  {
    actorId: { type: Number, default: null, index: true },
    actorRole: { type: String, default: null },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed, default: null },
    description: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'activity_logs' }
);

activityLogSchema.index({ createdAt: -1 });

export const ActivityLogModel = model<ActivityLogDoc>('ActivityLog', activityLogSchema);
