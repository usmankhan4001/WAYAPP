import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

/**
 * Admin-only switch for AuthConfig.allowRegistration. The register route already refuses new
 * sign-ups (except the very first account) when this is false.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  const config = await prisma.authConfig.findUnique({ where: { id: 'default' } });
  return NextResponse.json({ allowRegistration: config?.allowRegistration !== false });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (typeof body?.allowRegistration !== 'boolean') {
    return NextResponse.json({ error: 'allowRegistration must be true or false.' }, { status: 400 });
  }

  try {
    const config = await prisma.authConfig.upsert({
      where: { id: 'default' },
      update: { allowRegistration: body.allowRegistration },
      create: { id: 'default', allowRegistration: body.allowRegistration },
    });
    logger.info({ allowRegistration: config.allowRegistration }, 'Registration switch changed');
    return NextResponse.json({ allowRegistration: config.allowRegistration });
  } catch (error) {
    logger.error({ error }, 'Failed to update registration switch');
    return NextResponse.json({ error: 'Could not save the setting.' }, { status: 500 });
  }
}
