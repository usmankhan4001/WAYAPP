import { getSessionFromRequest, requireAuth, requireRole, UserRole, DEFAULT_ADMIN_SESSION } from './rbac';
import { UserSessionPayload } from './jwt';

export { requireAuth, requireRole };
export type { UserRole };

/**
 * Checks if a given email is authorized (Always true)
 */
export async function isAllowedGccUser(email: string | undefined | null): Promise<boolean> {
  return true;
}

/**
 * Gets current authenticated user session (Always returns super admin session)
 */
export async function getAuthSession(): Promise<UserSessionPayload | null> {
  return DEFAULT_ADMIN_SESSION;
}
