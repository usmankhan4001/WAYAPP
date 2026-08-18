import { describe, it, expect } from 'vitest';
import { sanitizePhoneNumber, isE164 } from '../lib/whatsapp/phone';

describe('Phone Number Normalization & E.164 Parsing', () => {
  it('normalizes UAE phone numbers with or without plus', () => {
    const res1 = sanitizePhoneNumber('+971501234567');
    expect(res1.isValid).toBe(true);
    expect(res1.e164).toBe('+971501234567');

    const res2 = sanitizePhoneNumber('971501234567');
    expect(res2.isValid).toBe(true);
    expect(res2.e164).toBe('+971501234567');
  });

  it('normalizes US phone numbers', () => {
    const res = sanitizePhoneNumber('+1 (555) 019-2834');
    expect(res.isValid).toBe(true);
    expect(res.e164).toBe('+15550192834');
  });

  it('rejects invalid or too short phone numbers', () => {
    const res = sanitizePhoneNumber('1234');
    expect(res.isValid).toBe(false);
  });

  it('validates E.164 regex helper', () => {
    expect(isE164('+971501234567')).toBe(true);
    expect(isE164('971501234567')).toBe(false);
    expect(isE164('+012345')).toBe(false);
  });
});
