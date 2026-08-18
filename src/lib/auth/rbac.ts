import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySessionToken, SESSION_COOKIE_NAME, UserSessionPayload } from './jwt';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

/**
 * Checks if a user role meets or exceeds a minimum required role level
 */
export function hasMinimumRole(userRole: string, requiredRole: UserRole): boolean {
  const currentLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 99;
  return currentLevel >= requiredLevel;
}

/**
 * Extracts and verifies the current session from incoming request or next/headers cookies
 */
export async function getSessionFromRequest(request?: NextRequest): Promise<UserSessionPayload | null> {
  let token: string | undefined;

  if (request) {
    token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Not in a Next.js Server Components / Action context
    }
  }

  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // Optional server-side session revocation check if jti is present
  if (payload.jti) {
    try {
      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: payload.jti },
        include: { user: true },
      });

      if (!dbSession || dbSession.expiresAt < new Date()) {
        return null; // Session revoked or expired in database
      }

      if (!dbSession.user.isActive) {
        return null; // User suspended
      }

      // Ensure payload role reflects up-to-date DB role
      payload.role = dbSession.user.role;
    } catch {
      // Fall back to JWT validity if DB is momentarily unreachable
    }
  }

  return payload;
}

/**
 * Enforces that a route requires authentication
 * Returns the payload if valid, or a JSON 401 response if unauthenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ session: UserSessionPayload } | { response: NextResponse }> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized: Valid authentication session is required' },
        { status: 401 }
      ),
    };
  }
  return { session };
}

/**
 * Enforces that a route requires a specific role or role hierarchy
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[] | UserRole
): Promise<{ session: UserSessionPayload } | { response: NextResponse }> {
  const authResult = await requireAuth(request);
  if ('response' in authResult) {
    return authResult;
  }

  const { session } = authResult;
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  const hasDirectRole = roles.includes(session.role as UserRole);
  const isSuperAdmin = session.role === 'SUPER_ADMIN';

  if (!hasDirectRole && !isSuperAdmin) {
    return {
      response: NextResponse.json(
        { error: `Forbidden: Insufficient privileges. Required role: ${roles.join(' or ')}` },
        { status: 403 }
      ),
    };
  }

  return { session };
}
