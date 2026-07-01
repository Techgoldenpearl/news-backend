import Redis from "ioredis";
import { ENV } from "./env.js";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(ENV.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      console.warn("[Redis] Error:", err.message);
    });

    redis.on("connect", () => {
      console.log("[Redis] Connected");
    });

    redis.connect().catch(() => {
      console.warn("[Redis] Could not connect — caching disabled");
      redis = null;
    });

    return redis;
  } catch {
    console.warn("[Redis] Not available — caching disabled");
    return null;
  }
}

const TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 900,
  SITE: 600,
};

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const data = await r.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export async function cacheSet(key: string, value: any, ttl: number = TTL.MEDIUM): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.setex(key, ttl, JSON.stringify(value));
  } catch {}
}

export async function cacheDel(pattern: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    if (pattern.includes("*")) {
      const keys = await r.keys(pattern);
      if (keys.length > 0) await r.del(...keys);
    } else {
      await r.del(pattern);
    }
  } catch {}
}

export { TTL };
