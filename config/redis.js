import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
const hasPlaceholder = /YOUR_|<[^>]+>|example\.com/i.test(redisUrl || '');

export const isRedisConfigured = Boolean(redisUrl && !hasPlaceholder);

if (!isRedisConfigured) {
  console.warn('[Redis] Disabled: set a real UPSTASH_REDIS_URL or REDIS_URL to enable caching and BullMQ.');
}

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(redisUrl?.startsWith('rediss://') && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
};

const redisClient = isRedisConfigured ? new Redis(redisUrl, redisOptions) : null;

if (redisClient) {
  redisClient.on('error', (error) => {
    console.error('Redis connection error:', error.message);
  });

  redisClient.on('connect', () => {
    console.log('Successfully connected to Redis.');
  });
}

export default redisClient;
