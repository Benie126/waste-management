import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { execute, query, queryOne } from '../config/db.mysql';
import { ApiError } from '../utils/ApiError';
import { pickupRepository } from '../repositories/pickup.repository';
import { eventBus, EVENT } from '../config/rabbitmq';
import { logActivity } from './activityLog.service';
import { AuthUser } from '../types';

export interface FeedbackRow extends RowDataPacket {
  feedback_id: number;
  pickup_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: Date;
  user_name: string;
}

export interface Feedback {
  feedbackId: number;
  pickupId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

function toFeedback(row: FeedbackRow): Feedback {
  return {
    feedbackId: row.feedback_id,
    pickupId: row.pickup_id,
    userId: row.user_id,
    userName: row.user_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export const feedbackService = {
  /** Producer leaves feedback after the collection is COMPLETED. */
  async create(user: AuthUser, input: { pickupId: number; rating: number; comment?: string | null }): Promise<Feedback> {
    const pickup = await pickupRepository.findPickupById(input.pickupId);
    if (!pickup) throw ApiError.notFound('Pickup not found');

    const requestRow = await pickupRepository.findRequestById((pickup as any).request_id);
    if (!requestRow) throw ApiError.notFound('Pickup request not found');
    if (requestRow.producer_id !== user.userId) {
      throw ApiError.forbidden('Only the waste producer can leave feedback for this pickup');
    }
    if (pickup.status !== 'COMPLETED') {
      throw ApiError.badRequest('Feedback can only be given after the collection is completed');
    }

    const existing = await queryOne<RowDataPacket>(
      'SELECT feedback_id FROM feedback WHERE pickup_id = ? AND user_id = ?',
      [input.pickupId, user.userId]
    );
    if (existing) throw ApiError.conflict('You have already submitted feedback for this pickup');

    const r: ResultSetHeader = await execute(
      'INSERT INTO feedback (pickup_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [input.pickupId, user.userId, input.rating, input.comment ?? null]
    );

    await eventBus.publish(EVENT.FEEDBACK_RECEIVED, {
      pickupId: input.pickupId,
      rating: input.rating,
      collectorUserId: requestRow.collector_user_id,
      producerId: user.userId,
    });

    await logActivity({
      actorId: user.userId,
      actorRole: user.role,
      action: 'FEEDBACK_SUBMITTED',
      entityType: 'feedback',
      entityId: r.insertId,
      description: `Left ${input.rating}-star feedback for pickup #${input.pickupId}`,
    });

    const row = await queryOne<FeedbackRow>(
      `SELECT f.*, u.name AS user_name FROM feedback f JOIN users u ON u.user_id = f.user_id WHERE f.feedback_id = ?`,
      [r.insertId]
    );
    if (!row) throw ApiError.notFound('Feedback not found');
    return toFeedback(row);
  },

  async listForPickup(pickupId: number): Promise<Feedback[]> {
    const rows = await query<FeedbackRow[]>(
      `SELECT f.*, u.name AS user_name FROM feedback f JOIN users u ON u.user_id = f.user_id WHERE f.pickup_id = ?`,
      [pickupId]
    );
    return rows.map(toFeedback);
  },

  async listAll(): Promise<Feedback[]> {
    const rows = await query<FeedbackRow[]>(
      `SELECT f.*, u.name AS user_name FROM feedback f JOIN users u ON u.user_id = f.user_id ORDER BY f.created_at DESC LIMIT 200`
    );
    return rows.map(toFeedback);
  },
};
