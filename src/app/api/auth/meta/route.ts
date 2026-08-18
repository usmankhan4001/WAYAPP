import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
  const authConfig = await prisma.authConfig.findUnique({ where: { id: 'default' } });

  const appId = authConfig?.metaAppId || process.env.META_APP_ID || '';
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/meta/callback`;

  if (!appId) {
    return NextResponse.redirect(
      new URL('/login?error=META_APP_ID_MISSING', request.url)
    );
  }

  // Generate secure random state and store in cookie
  const state = crypto.randomBytes(24).toString('hex');
  const metaOAuthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  metaOAuthUrl.searchParams.set('client_id', appId);
  metaOAuthUrl.searchParams.set('redirect_uri', redirectUri);
  metaOAuthUrl.searchParams.set('scope', 'email,public_profile');
  metaOAuthUrl.searchParams.set('response_type', 'code');
  metaOAuthUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(metaOAuthUrl.toString());
  response.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes
    path: '/',
  });

  return response;
}
