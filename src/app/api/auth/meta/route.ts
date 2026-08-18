import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db-init';

export async function GET(request: NextRequest) {
  await ensureDatabaseSchema();

  const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
  const authConfig = await prisma.authConfig.findUnique({ where: { id: 'default' } });

  // Resolve App ID
  const appId = authConfig?.metaAppId || process.env.META_APP_ID || settings?.phoneNumberId || '';
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/meta/callback`;

  // If no Meta App ID is configured, redirect with informative error
  if (!appId) {
    return NextResponse.redirect(
      new URL('/login?error=META_APP_ID_MISSING', request.url)
    );
  }

  // Construct Meta OAuth URL
  const state = Math.random().toString(36).substring(7);
  const metaOAuthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  metaOAuthUrl.searchParams.set('client_id', appId);
  metaOAuthUrl.searchParams.set('redirect_uri', redirectUri);
  metaOAuthUrl.searchParams.set('scope', 'email,public_profile');
  metaOAuthUrl.searchParams.set('response_type', 'code');
  metaOAuthUrl.searchParams.set('state', state);

  return NextResponse.redirect(metaOAuthUrl.toString());
}
