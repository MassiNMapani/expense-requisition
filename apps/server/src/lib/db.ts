import mongoose from 'mongoose';
import env from '../config/env';
import { logger } from './logger';

export async function connectDatabase(): Promise<typeof mongoose> {
  if (!env.mongoUri) {
    logger.info('MONGO_URI not set, skipping Mongo connection (dev-only).');
    return mongoose;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  logger.info('Connected to MongoDB');
  return mongoose;
}
