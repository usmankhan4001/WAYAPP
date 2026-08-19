import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySessionToken, UserSessionPayload, SESSION_COOKIE_NAME } from './jwt';
import { requireAuth, requireRole, getSessionFromRequest, hasMinimumRole } from './rbac';
import type { UserRole } from './rbac';

export { requireAuth, requireRole, getSessionFromRequest, hasMinimumRole };
export type { UserRole };

/**
 * Checks if a given email is allowed to use this instance, based on the
 * AuthConfig allow-list (allowedDomains suffix match / allowedEmails exact match).
 * Empty allow-lists mean "no restrictions".
 */
export async function isAllowedGccUser(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;

  try {
    const authConfig = await prisma.authConfig.findUnique({ where: { id: 'default' } });
    const allowedDomains = (authConfig?.allowedDomains || '')
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);
    const allowedEmails = (authConfig?.allowedEmails || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowedDomains.length === 0 && allowedEmails.length === 0) return true;

    const lowerEmail = email.toLowerCase();
    if (allowedEmails.includes(lowerEmail)) return true;

    const emailDomain = lowerEmail.split('@')[1] || '';
    return allowedDomains.includes(emailDomain);
  } catch {
    // DB unavailable — fail closed
    return false;
  }
}

/**
 * Gets the current authenticated user session from the request cookies.
 * For use in Server Components / Server Actions.
 */
export async function getAuthSession(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    // Revocation check
    const [dbSession, user] = await Promise.all([
      payload.jti
        ? prisma.session.findUnique({ where: { id: payload.jti } })
        : Promise.resolve(null),
      prisma.user.findUnique({ where: { id: payload.userId } }),
    ]);

    if (!user || !user.isActive || user.status === 'SUSPENDED') return null;
    if (payload.jti && (!dbSession || dbSession.expiresAt < new Date())) return null;

    return payload;
  } catch {
    return null;
  }
}
