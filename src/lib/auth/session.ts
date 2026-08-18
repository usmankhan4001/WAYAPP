import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, requireAuth, requireRole, UserRole } from './rbac';
import { UserSessionPayload } from './jwt';

export { requireAuth, requireRole };
export type { UserRole };

/**
 * Checks if a given email is authorized under GCC Business policy
 */
export async function isAllowedGccUser(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // If first user in database, allow registration as initial admin
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    return true;
  }

  // Fetch AuthConfig from DB
  const config = await prisma.authConfig.findUnique({
    where: { id: 'default' },
  });

  if (!config) {
    return true;
  }

  // If auth is not required, allow
  if (!config.requireAuth) return true;

  // Check if user already exists as an ACTIVE user
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existingUser) {
    return existingUser.isActive && existingUser.status !== 'SUSPENDED';
  }

  // Check Allowed Domains
  if (config.allowedDomains) {
    const domains = config.allowedDomains
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const emailDomain = cleanEmail.split('@')[1];
    if (emailDomain && (domains.includes(emailDomain) || domains.includes('*'))) {
      return true;
    }
  }

  // Check Explicit Whitelisted Emails
  if (config.allowedEmails) {
    const explicitEmails = config.allowedEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (explicitEmails.includes(cleanEmail)) {
      return true;
    }
  }

  return false;
}

/**
 * Gets current authenticated user session
 */
export async function getAuthSession(): Promise<UserSessionPayload | null> {
  return getSessionFromRequest();
}
