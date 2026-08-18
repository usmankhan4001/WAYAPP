import { describe, it, expect } from 'vitest';
import { signSessionToken, verifySessionToken } from '../lib/auth/jwt';

describe('JWT Authentication & Verification (Fail-Closed)', () => {
  it('signs and verifies a valid JWT session token', async () => {
    const payload = {
      userId: 'user_123',
      email: 'admin@gccstartup.com',
      name: 'Admin User',
      role: 'SUPER_ADMIN',
    };

    const token = await signSessionToken(payload, 3600);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('user_123');
    expect(verified?.email).toBe('admin@gccstartup.com');
    expect(verified?.role).toBe('SUPER_ADMIN');
  });

  it('fails closed on null or corrupted token', async () => {
    expect(await verifySessionToken(null)).toBeNull();
    expect(await verifySessionToken('')).toBeNull();
    expect(await verifySessionToken('invalid.token.string')).toBeNull();
  });

  it('fails closed on token signed with different key or tampered payload', async () => {
    const payload = {
      userId: 'user_123',
      email: 'admin@gccstartup.com',
      name: 'Admin User',
      role: 'SUPER_ADMIN',
    };

    const token = await signSessionToken(payload, 3600);
    const parts = token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}xyz.${parts[2]}`;

    const verified = await verifySessionToken(tamperedToken);
    expect(verified).toBeNull();
  });
});
