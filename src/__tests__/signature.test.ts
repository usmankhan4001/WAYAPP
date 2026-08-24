import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyMetaSignature } from '../lib/whatsapp/signature';

describe('Meta Webhook HMAC SHA-256 Signature Verification', () => {
  const secret = 'test_meta_app_secret_12345';
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

  it('validates a correct HMAC signature', () => {
    const signatureHex = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');

    const header = `sha256=${signatureHex}`;
    expect(verifyMetaSignature(body, header, secret)).toBe(true);
  });

  it('rejects an altered body with correct signature', () => {
    const signatureHex = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');

    const header = `sha256=${signatureHex}`;
    const tamperedBody = `${body} `;
    expect(verifyMetaSignature(tamperedBody, header, secret)).toBe(false);
  });

  it('rejects missing or malformed signature header', () => {
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, 'invalid_format', secret)).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=123', secret)).toBe(false);
  });

  it('rejects requests when appSecret is not configured (fail-closed)', () => {
    expect(verifyMetaSignature(body, 'sha256=anything', '')).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=anything', null)).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=anything', undefined)).toBe(false);
    expect(verifyMetaSignature(body, 'sha256=anything', '   ')).toBe(false);
  });
});
