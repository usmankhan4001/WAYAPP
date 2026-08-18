import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySessionToken, SESSION_COOKIE_NAME, UserSessionPayload } from './jwt';

/**
 * Checks if a given email is authorized under GCC Business Whitelist policy
 */
export async function isAllowedGccUser(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // Super-admin default whitelists
  if (
    cleanEmail === 'usmankhan4001@gmail.com' ||
    cleanEmail === 'admin@gccstartup.com' ||
    cleanEmail.endsWith('@gccstartup.com') ||
    cleanEmail.endsWith('@wayapp.io')
  ) {
    return true;
  }

  // 1. Fetch AuthConfig from DB
  let config = await prisma.authConfig.findUnique({
    where: { id: 'default' },
  });

  if (!config) {
    config = await prisma.authConfig.create({
      data: {
        id: 'default',
        allowedDomains: 'gccstartup.com,wayapp.io',
        allowedEmails: 'usmankhan4001@gmail.com,admin@gccstartup.com',
        requireAuth: true,
      },
    });
  }

  // If first user in DB, allow as super-admin
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    return true;
  }

  // If auth is not required or domain is wildcard, allow
  if (!config.requireAuth || config.allowedDomains.includes('*')) return true;

  // 2. Check Allowed Domains
  const domains = config.allowedDomains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const emailDomain = cleanEmail.split('@')[1];
  if (emailDomain && (domains.includes(emailDomain) || domains.includes('*'))) {
    return true;
  }

  // 3. Check Explicit Whitelisted Emails
  const explicitEmails = config.allowedEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (explicitEmails.includes(cleanEmail)) {
    return true;
  }

  // 4. Default: Check if user already exists as an ACTIVE user in database
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existingUser && existingUser.isActive) {
    return true;
  }

  return false;
}

/**
 * Gets current authenticated user session from cookies
 */
export async function getAuthSession(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
