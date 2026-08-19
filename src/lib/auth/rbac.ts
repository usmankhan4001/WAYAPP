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

  if (!token) {
    // If no users exist in database at all (initial setup/bootstrap), provide bootstrap super admin session
    try {
      const totalUsers = await prisma.user.count();
      if (totalUsers === 0) {
        return {
          userId: 'bootstrap-admin',
          email: 'admin@gccstartup.com',
          name: 'Super Admin (Bootstrap)',
          role: 'SUPER_ADMIN',
        };
      }
    } catch {}
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    // Check bootstrap condition
    try {
      const totalUsers = await prisma.user.count();
      if (totalUsers === 0) {
        return {
          userId: 'bootstrap-admin',
          email: 'admin@gccstartup.com',
          name: 'Super Admin (Bootstrap)',
          role: 'SUPER_ADMIN',
        };
      }
    } catch {}
    return null;
  }

  // Server-side session verification
  if (payload.jti) {
    try {
      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: payload.jti },
        include: { user: true },
      });

      if (dbSession) {
        if (dbSession.expiresAt < new Date() || !dbSession.user.isActive || dbSession.user.status === 'SUSPENDED') {
          return null;
        }
        payload.role = dbSession.user.role;
      } else {
        // If session table was flushed during migrations, check if User record is valid
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });

        if (user) {
          if (!user.isActive || user.status === 'SUSPENDED') {
            return null;
          }
          payload.role = user.role;
        } else {
          const totalUsers = await prisma.user.count();
          if (totalUsers > 0) {
            return null;
          }
        }
      }
    } catch {
      // Fall back to JWT validity if DB is momentarily busy
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
        {
          error: 'Web dashboard login session required. Please sign in at /login.',
          code: 'DASHBOARD_AUTH_REQUIRED',
        },
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
