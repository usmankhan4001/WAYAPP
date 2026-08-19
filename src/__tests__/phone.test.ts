import { describe, it, expect } from 'vitest';
import { sanitizePhoneNumber, isE164 } from '../lib/whatsapp/phone';
import { normalizePhoneNumber } from '../lib/utils';

describe('Phone Number Normalization & E.164 Parsing', () => {
  it('normalizes UAE phone numbers with or without plus or with 00', () => {
    const res1 = sanitizePhoneNumber('+971501234567');
    expect(res1.isValid).toBe(true);
    expect(res1.e164).toBe('+971501234567');

    const res2 = sanitizePhoneNumber('971501234567');
    expect(res2.isValid).toBe(true);
    expect(res2.e164).toBe('+971501234567');

    const res3 = sanitizePhoneNumber('00971501234567');
    expect(res3.isValid).toBe(true);
    expect(res3.e164).toBe('+971501234567');

    const res4 = sanitizePhoneNumber('0501234567', 'AE');
    expect(res4.isValid).toBe(true);
    expect(res4.e164).toBe('+971501234567');
  });

  it('normalizes Saudi and Pakistan phone numbers without prepending +1', () => {
    const resSA = sanitizePhoneNumber('966501234567');
    expect(resSA.isValid).toBe(true);
    expect(resSA.e164).toBe('+966501234567');

    const resPK = sanitizePhoneNumber('923001234567');
    expect(resPK.isValid).toBe(true);
    expect(resPK.e164).toBe('+923001234567');
  });

  it('normalizes US phone numbers', () => {
    const res = sanitizePhoneNumber('+1 (555) 019-2834');
    expect(res.isValid).toBe(true);
    expect(res.e164).toBe('+15550192834');

    const res2 = sanitizePhoneNumber('15550192834');
    expect(res2.isValid).toBe(true);
    expect(res2.e164).toBe('+15550192834');
  });

  it('normalizePhoneNumber utility correctly formats without appending +1', () => {
    expect(normalizePhoneNumber('971501234567')).toBe('+971501234567');
    expect(normalizePhoneNumber('+971501234567')).toBe('+971501234567');
    expect(normalizePhoneNumber('966501234567')).toBe('+966501234567');
    expect(normalizePhoneNumber('923001234567')).toBe('+923001234567');
    expect(normalizePhoneNumber('0501234567', 'AE')).toBe('+971501234567');
    expect(normalizePhoneNumber('+1 (555) 019-2834')).toBe('+15550192834');
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
