import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey } from '../lib/api/auth';

describe('API Key Generation & Hashing', () => {
  it('generates secure keys with prefix and deterministic hash', () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey();

    expect(rawKey.startsWith('way_live_')).toBe(true);
    expect(keyPrefix).toBe(rawKey.substring(0, 12));
    expect(keyHash).toBe(hashApiKey(rawKey));
    expect(keyHash).not.toBe(rawKey);
  });
});
