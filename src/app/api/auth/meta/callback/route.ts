import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/jwt';
import { isAllowedGccUser } from '@/lib/auth/session';
import { ensureDatabaseSchema } from '@/lib/db-init';

export async function GET(request: NextRequest) {
  await ensureDatabaseSchema();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error || 'OAuth cancelled')}`, request.url)
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

    const email = profile.email || `${profile.id}@meta.gccstartup.com`;
    const name = profile.name || 'GCC Team Member';
    const avatarUrl = profile.picture?.data?.url || null;

    // 3. Security Gate: Verify GCC Domain / Email Whitelist
    const isAllowed = await isAllowedGccUser(email);
    if (!isAllowed) {
      return NextResponse.redirect(
        new URL('/login?error=ACCESS_DENIED_NOT_GCC_USER', request.url)
      );
    }

    // 4. Check if first user in database (Super Admin)
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'SUPER_ADMIN' : 'MEMBER';

    // 5. Upsert User in Database
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
        lastLoginAt: new Date(),
      },
    });

    // 6. Sign JWT Session Token
    const sessionToken = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name || 'GCC Member',
      avatarUrl: user.avatarUrl,
      role: user.role,
    });

    // 7. Set HTTP-Only Cookie and Redirect to Dashboard
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message)}`, request.url)
    );
  }
}
