import { Queue } from 'bullmq';
import redisClient from '../config/redis.js';

// This queue will hold your Stripe webhook tasks
export const webhookQueue = new Queue('stripe-webhooks', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 }
  }
});
