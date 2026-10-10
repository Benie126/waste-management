import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '4000')),
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),

  mysql: {
    host: optional('MYSQL_HOST', '127.0.0.1'),
    port: Number(optional('MYSQL_PORT', '3306')),
    database: optional('MYSQL_DATABASE', 'wastelink'),
    user: optional('MYSQL_USER', 'root'),
    password: optional('MYSQL_PASSWORD', ''),
    connectionLimit: Number(optional('MYSQL_CONNECTION_LIMIT', '10')),
  },

  mongoUri: optional('MONGODB_URI', 'mongodb://127.0.0.1:27017/wastelink'),

  jwt: {
    secret: required('JWT_SECRET', 'dev-only-change-me'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },

  google: {
    clientId: optional('GOOGLE_CLIENT_ID'),
    clientSecret: optional('GOOGLE_CLIENT_SECRET'),
  },

  rabbitmq: {
    url: optional('RABBITMQ_URL', 'amqp://127.0.0.1:5672'),
    exchange: optional('RABBITMQ_EXCHANGE', 'wastelink.events'),
    queue: optional('RABBITMQ_QUEUE', 'wastelink.notifications'),
    enabled: optional('RABBITMQ_ENABLED', 'true') !== 'false',
  },

  email: {
    enabled: optional('EMAIL_ENABLED', 'false') === 'true',
    host: optional('EMAIL_HOST'),
    port: Number(optional('EMAIL_PORT', '587')),
    user: optional('EMAIL_USER'),
    password: optional('EMAIL_PASSWORD'),
    from: optional('EMAIL_FROM', 'WasteLink <no-reply@wastelink.local>'),
  },
};

export const isProd = env.nodeEnv === 'production';
