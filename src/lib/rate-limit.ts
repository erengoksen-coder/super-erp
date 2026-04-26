import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  interval: number; // ms
  uniqueTokenPerInterval: number;
};

/**
 * Livasofa ERP Simple Rate Limiting Helper
 * Uses in-memory LRU cache to track requests per IP.
 */
export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000, // 1 minute default
  });

  return {
    check: (limit: number, token: string) => 
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        return isRateLimited ? reject() : resolve();
      }),
  };
}

// Global limiter instance (50 requests per minute per IP)
export const apiLimiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 1000,
});
