import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'wayapp_session';

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: AUTH_SECRET environment variable is missing in production!');
    }
    // Fallback development-only secret
    return new TextEncoder().encode('wayapp_dev_insecure_auth_secret_must_be_set_in_production_32bytes');
  }
  return new TextEncoder().encode(secret);
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
