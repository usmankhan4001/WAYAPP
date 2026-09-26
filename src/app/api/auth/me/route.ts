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

  const [user, authConfig, dbSession] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.authConfig.findUnique({ where: { id: 'default' } }),
    session.jti ? prisma.session.findUnique({ where: { id: session.jti } }) : null,
  ]);

  const response = NextResponse.json({
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

  // Sliding Session Extension: If token has less than 3 days left, extend session in DB and re-issue cookie
  try {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expSeconds = session.exp || 0;
    const remainingSeconds = expSeconds - nowSeconds;
    const THREE_DAYS_SECONDS = 3 * 24 * 60 * 60;

    if (remainingSeconds > 0 && remainingSeconds < THREE_DAYS_SECONDS && session.jti) {
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.session.update({
        where: { id: session.jti },
        data: { expiresAt: newExpiresAt },
      }).catch(() => {});

      const { signSessionToken, SESSION_COOKIE_NAME } = await import('@/lib/auth/jwt');
      const refreshedToken = await signSessionToken(
        {
          userId: session.userId,
          email: session.email,
          name: session.name,
          avatarUrl: session.avatarUrl,
          role: session.role,
          jti: session.jti,
        },
        7 * 24 * 60 * 60
      );

      response.cookies.set(SESSION_COOKIE_NAME, refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }
  } catch (renewErr) {
    // Non-blocking sliding renewal error
    console.warn('[Auth /me] Sliding token renewal skipped:', renewErr);
  }

  return response;
}
