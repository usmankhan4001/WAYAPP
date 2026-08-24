import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { authenticated: false, user: null, authConfig: null },
      { status: 401 }
    );
  }

  const [user, authConfig] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.authConfig.findUnique({ where: { id: 'default' } }),
  ]);

  return NextResponse.json({
    authenticated: true,
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          isActive: user.isActive,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        }
      : {
          id: session.userId,
          email: session.email,
          name: session.name,
          role: session.role,
        },
    authConfig: authConfig
      ? {
          requireAuth: authConfig.requireAuth,
          allowRegistration: authConfig.allowRegistration,
        }
      : { requireAuth: true, allowRegistration: true },
  });
}
