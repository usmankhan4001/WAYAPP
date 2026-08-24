import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'wayapp_session';

/**
 * Resolves the JWT signing secret. Fail-closed in production:
 * if AUTH_SECRET / JWT_SECRET is missing the process throws instead
 * of falling back to a publicly-known constant.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV !== 'production') {
    // Development/test-only secret. Never used in production (see throw below).
    return new TextEncoder().encode('wayapp-dev-only-secret-0123456789abcdef');
  }
  throw new Error(
    '[Auth] AUTH_SECRET (or JWT_SECRET) must be set to a value of at least 16 characters in production. Generate one with: openssl rand -base64 48'
  );
}

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'VIEWER' | string;
  jti?: string;
  exp?: number;
}

/**
 * Signs a JWT session token using jose (HS256)
 */
export async function signSessionToken(
  payload: Omit<UserSessionPayload, 'exp'>,
  expiresInSeconds: number = 24 * 60 * 60 // 24 hours standard
): Promise<string> {
  const secret = getJwtSecret();
  const jti = payload.jti || crypto.randomUUID();

  return await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secret);
}

/**
 * Verifies a JWT session token with jose (HS256) - fail-closed
 */
export async function verifySessionToken(token: string | undefined | null): Promise<UserSessionPayload | null> {
  if (!token) return null;

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    if (!payload.userId || !payload.email) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: (payload.name as string) || '',
      avatarUrl: (payload.avatarUrl as string | null) || null,
      role: (payload.role as string) || 'MEMBER',
      jti: payload.jti,
      exp: payload.exp,
    };
  } catch (error) {
    // Fail closed on any verification error (signature mismatch, expired, malformed)
    return null;
  }
}
