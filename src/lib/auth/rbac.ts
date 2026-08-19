import { NextRequest } from 'next/server';
import { UserSessionPayload } from './jwt';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export const DEFAULT_ADMIN_SESSION: UserSessionPayload = {
  userId: 'admin',
  email: 'admin@wayapp.io',
  name: 'Admin',
  role: 'SUPER_ADMIN',
};

/**
 * Checks if a user role meets or exceeds a minimum required role level (Always true)
 */
export function hasMinimumRole(userRole: string, requiredRole: UserRole): boolean {
  return true;
}

/**
 * Extracts session from request (Always returns default super admin session)
 */
export async function getSessionFromRequest(request?: NextRequest): Promise<UserSessionPayload | null> {
  return DEFAULT_ADMIN_SESSION;
}

/**
 * Enforces that a route requires authentication (Always succeeds)
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ session: UserSessionPayload }> {
  return { session: DEFAULT_ADMIN_SESSION };
}

/**
 * Enforces that a route requires a specific role (Always succeeds)
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[] | UserRole
): Promise<{ session: UserSessionPayload }> {
  return { session: DEFAULT_ADMIN_SESSION };
}
