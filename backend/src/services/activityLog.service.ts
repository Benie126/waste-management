import { ActivityLogModel } from '../models/mongo/ActivityLog';
import { mongoReady } from '../config/db.mongo';

interface LogInput {
  actorId?: number | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: number | string | null;
  description?: string;
}

/**
 * Fire-and-forget activity logging. Never let logging break the main request:
 * if Mongo is down we simply skip the write.
 */
export async function logActivity(input: LogInput): Promise<void> {
  if (!mongoReady()) return;
  try {
    await ActivityLogModel.create({
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      description: input.description ?? '',
    });
  } catch (err) {
    console.warn('[activity-log] failed to write log:', (err as Error).message);
  }
}

export async function listActivity(limit = 100): Promise<unknown[]> {
  if (!mongoReady()) return [];
  return ActivityLogModel.find().sort({ createdAt: -1 }).limit(limit).lean();
}
