import { eventBus, EVENT, WasteLinkEvent } from '../../config/rabbitmq';
import { createNotification } from '../../services/notification.service';
import { sendEmail } from '../../services/email.service';
import { queryOne } from '../../config/db.mysql';
import { RowDataPacket } from 'mysql2';

async function emailOf(userId: number): Promise<string | null> {
  const row = await queryOne<RowDataPacket & { email: string }>(
    'SELECT email FROM users WHERE user_id = ?',
    [userId]
  );
  return row?.email ?? null;
}

/**
 * Single notification handler for every WasteLink domain event.
 * This is the piece that runs on the RabbitMQ consumer side.
 */
async function handle(event: WasteLinkEvent): Promise<void> {
  const p = event.payload;

  switch (event.type) {
    case EVENT.PICKUP_REQUESTED: {
      await createNotification({
        userId: p.producerId,
        type: 'PICKUP_REQUESTED',
        message: `${p.collectorName} requested to collect your ${p.categoryName} listing.`,
        meta: { listingId: p.listingId, requestId: p.requestId },
      });
      const email = await emailOf(p.producerId);
      if (email) await sendEmail(email, 'New pickup request', `A collector requested your listing #${p.listingId}.`);
      break;
    }

    case EVENT.PICKUP_ACCEPTED: {
      await createNotification({
        userId: p.collectorUserId,
        type: 'PICKUP_ACCEPTED',
        message: `Your pickup request for ${p.categoryName} was accepted.`,
        meta: { listingId: p.listingId, requestId: p.requestId },
      });
      const email = await emailOf(p.collectorUserId);
      if (email) await sendEmail(email, 'Pickup request accepted', `Your request #${p.requestId} was accepted.`);
      break;
    }

    case EVENT.PICKUP_REJECTED: {
      await createNotification({
        userId: p.collectorUserId,
        type: 'PICKUP_REJECTED',
        message: `Your pickup request for ${p.categoryName} was rejected.`,
        meta: { listingId: p.listingId, requestId: p.requestId },
      });
      break;
    }

    case EVENT.PICKUP_SCHEDULED: {
      await createNotification({
        userId: p.collectorUserId,
        type: 'PICKUP_SCHEDULED',
        message: `Pickup scheduled for ${new Date(p.scheduledDate).toLocaleString()}.`,
        meta: { pickupId: p.pickupId, requestId: p.requestId },
      });
      const email = await emailOf(p.collectorUserId);
      if (email)
        await sendEmail(email, 'Pickup scheduled', `Pickup #${p.pickupId} scheduled for ${p.scheduledDate}.`);
      break;
    }

    case EVENT.COLLECTION_COMPLETED: {
      await createNotification({
        userId: p.producerId,
        type: 'COLLECTION_COMPLETED',
        message: `Collection of your ${p.categoryName} listing is complete. Please leave feedback.`,
        meta: { pickupId: p.pickupId, listingId: p.listingId },
      });
      break;
    }

    case EVENT.COLLECTOR_VERIFIED: {
      await createNotification({
        userId: p.userId,
        type: 'COLLECTOR_VERIFIED',
        message:
          p.status === 'VERIFIED'
            ? 'Your collector account has been verified. You can now request pickups.'
            : 'Your collector account verification was rejected.',
        meta: { verificationStatus: p.status },
      });
      const email = await emailOf(p.userId);
      if (email) await sendEmail(email, 'Collector verification update', `Status: ${p.status}`);
      break;
    }

    case EVENT.FEEDBACK_RECEIVED: {
      await createNotification({
        userId: p.collectorUserId,
        type: 'SYSTEM',
        message: `You received a ${p.rating}-star rating from a waste producer.`,
        meta: { pickupId: p.pickupId, rating: p.rating },
      });
      break;
    }

    case EVENT.USER_REGISTERED: {
      await createNotification({
        userId: p.userId,
        type: 'SYSTEM',
        message: 'Welcome to WasteLink! Complete your profile to get started.',
        meta: {},
      });
      break;
    }

    default:
      console.log('[notification.consumer] unhandled event type:', event.type);
  }
}

/** Wire the consumer to the event bus. Called once during server startup. */
export function registerNotificationConsumer(): void {
  eventBus.onEvent(handle);
}
