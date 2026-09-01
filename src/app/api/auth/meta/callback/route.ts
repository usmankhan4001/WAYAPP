import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/jwt';
import { isAllowedUser } from '@/lib/auth/session';
import { timingSafeCompare } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const cookieState = request.cookies.get('meta_oauth_state')?.value;

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error || 'OAuth cancelled')}`, request.url)
    );
  }

  // Validate state token against state cookie
  if (!state || !cookieState || !timingSafeCompare(state, cookieState)) {
    return NextResponse.redirect(
      new URL('/login?error=INVALID_OAUTH_STATE', request.url)
    );
  }

  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const authConfig = await prisma.authConfig.findUnique({ where: { id: 'default' } });

    const appId = authConfig?.metaAppId || process.env.META_APP_ID || '';
    const appSecret = authConfig?.metaAppSecret || settings?.appSecret || process.env.META_APP_SECRET || '';
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/meta/callback`;

    // 1. Exchange authorization code for User Access Token
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error?.message || 'Failed to exchange Meta OAuth code');
    }

    const userAccessToken = tokenData.access_token;

    // 2. Fetch User Profile & Email
    const profileRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.type(large)&access_token=${userAccessToken}`
    );
    const profile = await profileRes.json();

    if (!profileRes.ok || profile.error) {
      throw new Error(profile.error?.message || 'Failed to fetch user profile from Meta');
    }

    // Require real verified email - reject synthesized emails
    if (!profile.email) {
      return NextResponse.redirect(
        new URL('/login?error=EMAIL_REQUIRED_FROM_META', request.url)
      );
    }

    const email = profile.email.toLowerCase().trim();
    const name = profile.name || email.split('@')[0];
    const avatarUrl = profile.picture?.data?.url || null;

    // 3. Security Gate: Verify Allowed Domain / Whitelist
    const isAllowed = await isAllowedUser(email);
    if (!isAllowed) {
      return NextResponse.redirect(
        new URL('/login?error=ACCESS_DENIED', request.url)
      );
    }

    // 4. Resolve role & upsert user
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'SUPER_ADMIN' : 'MEMBER';

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        avatarUrl,
        metaUserId: profile.id,
        lastLoginAt: new Date(),
      },
      create: {
        email,
        name,
        avatarUrl,
        metaUserId: profile.id,
        role,
        status: 'ACTIVE',
        isActive: true,
        lastLoginAt: new Date(),
      },
    });

    // 5. Create DB Session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        id: sessionId,
        sessionToken: sessionId,
        userId: user.id,
        expiresAt,
        userAgent: request.headers.get('user-agent') || 'meta-oauth',
      },
    });

    // 6. Sign JWT
    const sessionToken = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      avatarUrl: user.avatarUrl,
      role: user.role,
      jti: sessionId,
    });

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('meta_oauth_state');
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message)}`, request.url)
    );
  }
}
