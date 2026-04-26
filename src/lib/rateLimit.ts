import { LRUCache } from 'lru-cache';
import { NextRequest } from 'next/server';

/**
 * Super ERP - Rate Limiting Utility
 * Uses an in-memory LRU cache to track request frequencies per IP.
 */

interface RateLimitConfig {
    uniqueTokenPerInterval?: number;
    interval: number; // in milliseconds
    limit: number;    // max requests per interval
}

const tokenCache = new LRUCache<string, number[]>({
    max: 500, // Maximum unique IPs to track
    ttl: 60 * 1000, // 1 minute default TTL
});

export function rateLimit(options: RateLimitConfig) {
    return {
        check: (request: NextRequest, label: string) => {
            const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
            const token = `${label}:${ip}`;
            const limit = options.limit;
            const interval = options.interval;
            
            const now = Date.now();
            const tokenCount = tokenCache.get(token) || [];
            
            // Filter out old timestamps
            const updatedCount = tokenCount.filter((timestamp) => now - timestamp < interval);
            
            if (updatedCount.length >= limit) {
                return {
                    success: false,
                    limit,
                    remaining: 0,
                };
            }
            
            updatedCount.push(now);
            tokenCache.set(token, updatedCount);
            
            return {
                success: true,
                limit,
                remaining: limit - updatedCount.length,
            };
        }
    };
}

// Pre-defined limiters
export const loginLimiter = rateLimit({ interval: 60 * 1000, limit: 5 });
export const webhookLimiter = rateLimit({ interval: 1000, limit: 20 });
export const pushLimiter = rateLimit({ interval: 60 * 1000, limit: 50 });
