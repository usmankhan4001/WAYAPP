import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE_NAME } from '@/lib/auth/jwt';

/**
 * Edge-safe secret resolver (mirrors src/lib/auth/jwt.ts; cannot import
 * non-edge code here). Fail-closed in production.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV !== 'production') {
    return new TextEncoder().encode('wayapp-dev-only-secret-0123456789abcdef');
  }
  throw new Error(
    '[Auth] AUTH_SECRET (or JWT_SECRET) must be set to a value of at least 16 characters in production.'
  );
}

/**
 * Middleware: stateless page protection.
 * Pages require a valid signed session cookie; otherwise redirect to /login.
 * (API routes perform their own DB-backed auth via requireAuth/requireRole;
 * /api is excluded here so they can return proper 401/403 JSON responses.)
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let valid = false;
  if (token) {
    try {
      const secret = getJwtSecret();
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
      valid = Boolean(payload.userId && payload.email);
    } catch (error) {
      // Edge runtime: pino isn't available here, so use console directly.
      console.warn('[Middleware] Session token verification failed:', error);
      valid = false;
    }
  }

  if (!valid) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js)|manifest.json|manifest.webmanifest|sw.js|uploads|api|login|register|setup|design).*)',
  ],
};
