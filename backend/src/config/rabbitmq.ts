import amqp, { ConsumeMessage } from 'amqplib';

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;
import { EventEmitter } from 'events';
import { env } from './env';

export interface WasteLinkEvent {
  type: string;
  payload: Record<string, any>;
  occurredAt: string;
}

type Handler = (event: WasteLinkEvent) => Promise<void> | void;

/**
 * RabbitMQ wrapper.
 *
 * The application publishes domain events (pickup request created, pickup
 * accepted, ...) to a topic exchange. A single durable queue consumes those
 * events and the notification handler turns them into notifications.
 *
 * If the broker is not reachable we transparently fall back to an in-process
 * EventEmitter so the whole workflow still runs end-to-end. Setting
 * RABBITMQ_URL to a live broker is all that is needed to switch to real
 * asynchronous messaging.
 */
class EventBus {
  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;
  private local = new EventEmitter();
  private handlers: Handler[] = [];
  private connected = false;

  get isConnected(): boolean {
    return this.connected;
  }

  get transport(): 'rabbitmq' | 'in-memory' {
    return this.connected ? 'rabbitmq' : 'in-memory';
  }

  /** Register a consumer handler. Safe to call before connect(). */
  onEvent(handler: Handler): void {
    this.handlers.push(handler);
  }

  async connect(): Promise<void> {
    if (!env.rabbitmq.enabled) {
      console.warn('[rabbitmq] disabled via RABBITMQ_ENABLED=false, using in-memory bus');
      return;
    }
    try {
      this.connection = await amqp.connect(env.rabbitmq.url);
      this.connection.on('error', (err) => console.warn('[rabbitmq] connection error:', err.message));
      this.connection.on('close', () => {
        this.connected = false;
        console.warn('[rabbitmq] connection closed, falling back to in-memory bus');
      });

      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(env.rabbitmq.exchange, 'topic', { durable: true });
      await this.channel.assertQueue(env.rabbitmq.queue, { durable: true });
      await this.channel.bindQueue(env.rabbitmq.queue, env.rabbitmq.exchange, '#');

      await this.channel.consume(env.rabbitmq.queue, (msg) => this.handleMessage(msg), {
        noAck: false,
      });

      this.connected = true;
      console.log(`[rabbitmq] connected to ${env.rabbitmq.url} (exchange: ${env.rabbitmq.exchange})`);
    } catch (err) {
      this.connected = false;
      console.warn(
        `[rabbitmq] could not connect (${(err as Error).message}). ` +
          'Using in-memory event bus instead.'
      );
    }
  }

  private async handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;
    try {
      const event = JSON.parse(msg.content.toString()) as WasteLinkEvent;
      await this.dispatch(event);
      this.channel.ack(msg);
    } catch (err) {
      console.error('[rabbitmq] failed to process message:', (err as Error).message);
      // Requeue is risky for poison messages; drop after logging.
      this.channel.nack(msg, false, false);
    }
  }

  private async dispatch(event: WasteLinkEvent): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error('[events] handler failed:', (err as Error).message);
      }
    }
  }

  /** Publish a domain event. Falls back to local dispatch when offline. */
  async publish(type: string, payload: Record<string, any>): Promise<void> {
    const event: WasteLinkEvent = { type, payload, occurredAt: new Date().toISOString() };

    if (this.connected && this.channel) {
      try {
        const ok = this.channel.publish(
          env.rabbitmq.exchange,
          type,
          Buffer.from(JSON.stringify(event)),
          { persistent: true, contentType: 'application/json' }
        );
        if (ok) return;
        console.warn('[rabbitmq] publish buffer full, falling back to in-memory dispatch');
      } catch (err) {
        console.warn('[rabbitmq] publish failed:', (err as Error).message);
      }
    }

    // In-memory fallback keeps the workflow functional without a broker.
    await this.dispatch(event);
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      /* ignore */
    }
    this.connected = false;
  }
}

export const eventBus = new EventBus();

export const EVENT = {
  PICKUP_REQUESTED: 'pickup.requested',
  PICKUP_ACCEPTED: 'pickup.accepted',
  PICKUP_REJECTED: 'pickup.rejected',
  PICKUP_SCHEDULED: 'pickup.scheduled',
  COLLECTION_COMPLETED: 'collection.completed',
  COLLECTOR_VERIFIED: 'collector.verified',
  FEEDBACK_RECEIVED: 'feedback.received',
  USER_REGISTERED: 'user.registered',
} as const;

export type EventType = (typeof EVENT)[keyof typeof EVENT];
