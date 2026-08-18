/**
 * In-memory sliding window rate limiter
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired rate limit entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (record.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  limit: number;      // Maximum allowed requests in window
  windowSeconds: number; // Window size in seconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Checks rate limit for a given identifier (e.g. IP, user ID, endpoint)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 60, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const record = memoryStore.get(identifier);

  if (!record || record.resetAt <= now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    memoryStore.set(identifier, newRecord);
    return {
      success: true,
      limit: options.limit,
      remaining: Math.max(0, options.limit - 1),
      resetAt: newRecord.resetAt,
    };
  }

  if (record.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - record.count),
    resetAt: record.resetAt,
  };
}

/**
 * Helper to get client IP from NextRequest headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
