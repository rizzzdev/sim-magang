import { Redis } from 'ioredis';
import { env } from '@/configs/env.js';

let redisInstance: Redis | null = null;

try {
  if (env.REDIS_URL) {
    redisInstance = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[Cache] Redis connection failed after 3 retries, disabling cache.');
          return null; // Stop retrying, Redis stays null
        }
        return Math.min(times * 200, 1000); // 200ms, 400ms, 600ms
      },
    });

    redisInstance.on('error', (err) => {
      console.warn('[Cache] Redis error (cache disabled):', err.message);
    });

    redisInstance.on('connect', () => {
      console.log('[Cache] Redis connected successfully');
    });
  }
} catch (e) {
  console.warn('[Cache] Failed to initialize Redis, cache disabled:', (e as Error).message);
}

export const redis = redisInstance;

export async function withCache<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  if (!redis) return fetcher();

  const cached = await redis.get(key);
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch (e) {
      console.warn(`Failed to parse cache for key ${key}`);
    }
  }

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

export async function clearCachePattern(pattern: string): Promise<void> {
  if (!redis) return;
  
  // Using SCAN to safely delete keys matching pattern
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

export async function setCache(key: string, data: any, ttl: number): Promise<void> {
  if (!redis) return;
  await redis.setex(key, ttl, JSON.stringify(data));
}
