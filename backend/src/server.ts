import { createApp } from './app';
import { env } from './config/env';
import { testMySqlConnection, pool } from './config/db.mysql';
import { connectMongo, disconnectMongo } from './config/db.mongo';
import { eventBus } from './config/rabbitmq';
import { registerNotificationConsumer } from './rabbitmq/consumers/notification.consumer';

async function bootstrap() {
  // --- MySQL (required) ---------------------------------------------------
  try {
    await testMySqlConnection();
    console.log(`[mysql] connected to ${env.mysql.host}:${env.mysql.port}/${env.mysql.database}`);
  } catch (err) {
    console.error('[mysql] FATAL: could not connect.', (err as Error).message);
    console.error('Check your .env MYSQL_* values and that MySQL is running.');
    process.exit(1);
  }

  // --- MongoDB (non-relational data) -------------------------------------
  try {
    await connectMongo();
    console.log(`[mongo] connected to ${env.mongoUri}`);
  } catch (err) {
    console.warn(
      `[mongo] could not connect (${(err as Error).message}). ` +
        'Notifications and activity logs will be skipped until MongoDB is available.'
    );
  }

  // --- RabbitMQ + consumer ------------------------------------------------
  registerNotificationConsumer();
  await eventBus.connect();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] WasteLink API listening on http://localhost:${env.port}`);
    console.log(`[server] event transport: ${eventBus.transport}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close();
    await eventBus.close();
    await disconnectMongo().catch(() => undefined);
    await pool.end().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
