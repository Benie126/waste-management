import mongoose from 'mongoose';
import { env } from './env';

/**
 * MongoDB is used for non-relational data only:
 *  - notifications
 *  - system activity / event logs
 */
export async function connectMongo(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}
