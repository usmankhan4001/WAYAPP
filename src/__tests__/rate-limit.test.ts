import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../lib/rate-limit';

describe('In-Memory Sliding Window Rate Limiter', () => {
  it('allows requests within limit and blocks requests exceeding limit', () => {
    const testId = `test_ip_${Date.now()}`;
    const options = { limit: 3, windowSeconds: 10 };

    const res1 = checkRateLimit(testId, options);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(testId, options);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(testId, options);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request exceeds limit
    const res4 = checkRateLimit(testId, options);
    expect(res4.success).toBe(false);
    expect(res4.remaining).toBe(0);
  });
});
