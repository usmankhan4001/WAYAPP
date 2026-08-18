import { describe, it, expect } from 'vitest';
import { encryptString, decryptString, maskSecret, timingSafeCompare } from '../lib/crypto';

describe('AES-256-GCM Encryption & Token Security', () => {
  it('encrypts and decrypts a secret token cleanly', () => {
    const rawSecret = 'EAABwzLIXg123456789MetaTokenSecret!';
    const encrypted = encryptString(rawSecret);

    expect(encrypted).not.toBeNull();
    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted?.split(':')).toHaveLength(3); // iv:tag:ciphertext

    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it('masks sensitive tokens safely for API responses', () => {
    expect(maskSecret('EAABwzLIXg123456789MetaTokenSecret')).toBe('EAAB••••••••cret');
    expect(maskSecret('short')).toBe('••••••••');
    expect(maskSecret('')).toBe('');
  });

  it('performs timing-safe string comparison', () => {
    expect(timingSafeCompare('my_secret_token_123', 'my_secret_token_123')).toBe(true);
    expect(timingSafeCompare('my_secret_token_123', 'different_secret')).toBe(false);
    expect(timingSafeCompare('my_secret_token_123', 'my_secret_token_124')).toBe(false);
  });
});
