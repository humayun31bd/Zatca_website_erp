import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis only if the env vars are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Mock ratelimit if Redis is not configured (e.g., local dev without keys)
const mockRateLimit = {
  limit: async (identifier: string) => ({ success: true, pending: Promise.resolve(), limit: 10, remaining: 9, reset: Date.now() }),
};

// 1. WhatsApp Demo Rate Limiter: 3 requests per hour per IP/User
export const demoRateLimiter = redis 
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: '@upstash/ratelimit/demo',
    })
  : mockRateLimit;

// 2. Lead Capture Rate Limiter: 5 requests per minute per IP
export const leadRateLimiter = redis 
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: '@upstash/ratelimit/lead',
    })
  : mockRateLimit;

// 3. API/Invoice Creation Rate Limiter (Standard tier)
export const apiRateLimiter = redis 
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(10, '10 s', 100), // 100 tokens max, refills 10 every 10 seconds
      analytics: true,
      prefix: '@upstash/ratelimit/api',
    })
  : mockRateLimit;
