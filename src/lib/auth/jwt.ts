import crypto from 'crypto';

const JWT_SECRET = process.env.AUTH_SECRET || 'wayapp_gcc_jwt_secret_key_2026_enterprise';
export const SESSION_COOKIE_NAME = 'wayapp_session';

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
  exp: number; // Expiration timestamp (seconds)
}

/**
 * Base64 URL encoding
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64 URL decoding
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Signs a JWT session token with HMAC SHA-256
 */
export function signSessionToken(
  payload: Omit<UserSessionPayload, 'exp'>,
  expiresInSeconds: number = 7 * 24 * 60 * 60 // 7 days default
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload: UserSessionPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a JWT session token
 */
export function verifySessionToken(token: string | undefined | null): UserSessionPayload | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) return null;

    const payload: UserSessionPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowInSeconds) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
