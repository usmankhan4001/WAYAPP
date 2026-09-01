import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Public, unauthenticated check for whether this instance has completed
 * first-time setup. Used to route a fresh install into /setup instead of
 * /login, and to lock /setup once an account already exists.
 */
export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    return NextResponse.json({ needsSetup: totalUsers === 0 });
  } catch (error: any) {
    logger.error({ error }, 'Failed to check bootstrap status');
    // Fail closed: if we can't tell, assume setup is not needed so we don't
    // bounce an existing installation into the setup wizard.
    return NextResponse.json({ needsSetup: false });
  }
}
