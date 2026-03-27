import Redis from 'ioredis';
import { getEnv } from './env.js';
import Pino from 'pino';

const logger = Pino({ name: 'redis-client' });

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  const env = getEnv();
  
  // If no Redis URL, return null
  if (!env.REDIS_URL || env.REDIS_URL.includes('upstash.io')) {
    logger.warn('Redis: Using mock (Upstash REST not compatible with ioredis)');
    return null;
  }
  
  if (redisClient) {
    return redisClient;
  }
  
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 1) return null;
        return 1000;
      },
      connectionName: 'zk-solvency-backend',
      lazyConnect: true,
    });
    
    redisClient.on('error', () => {});
  } catch (e) {}
  
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (e) {}
    redisClient = null;
  }
}