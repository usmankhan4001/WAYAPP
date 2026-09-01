import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserSessionPayload, verifySessionToken, SESSION_COOKIE_NAME } from './jwt';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type AuthResult =
  | { session: UserSessionPayload }
  | { response: NextResponse };

export const ROLE_LEVELS: Record<UserRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Insufficient permissions'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Checks if a user role meets or exceeds a minimum required role level.
 */
export function hasMinimumRole(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_LEVELS[userRole as UserRole];
  const requiredLevel = ROLE_LEVELS[requiredRole];
  if (userLevel === undefined || requiredLevel === undefined) return false;
  return userLevel >= requiredLevel;
}

/**
 * Extracts the session from a request by verifying the signed JWT cookie
 * and validating it against the (revocable) DB session row.
 */
export async function getSessionFromRequest(request?: NextRequest): Promise<UserSessionPayload | null> {
  if (!request) return null;

  // Prefer a Bearer token (mobile / API clients), fall back to the session cookie (web).
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // Revocation check: the session row must still exist and the user be active
  try {
    const [dbSession, user] = await Promise.all([
      payload.jti
        ? prisma.session.findUnique({ where: { id: payload.jti } })
        : Promise.resolve(null),
      prisma.user.findUnique({ where: { id: payload.userId } }),
    ]);

    if (!user || !user.isActive || user.status === 'SUSPENDED') return null;
    if (payload.jti && (!dbSession || dbSession.expiresAt < new Date())) return null;
  } catch {
    // DB unavailable — fail closed rather than granting access
    return null;
  }

  return payload;
}

/**
 * Enforces that a route requires authentication. Returns the session on
 * success, or a 401 JSON response that the caller must short-circuit on.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { response: unauthorizedResponse() };
  }
  return { session };
}

/**
 * Enforces that a route requires a specific role (or a list of allowed roles).
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[] | UserRole
): Promise<AuthResult> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { response: unauthorizedResponse() };
  }

  const roles: UserRole[] = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const hasRole = roles.some((role) => session.role === role);
  if (!hasRole) {
    return { response: forbiddenResponse() };
  }

  return { session };
}
