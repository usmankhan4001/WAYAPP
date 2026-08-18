import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'wayapp_session';

/**
 * Public routes that do not require authentication
 */
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/meta',
  '/api/auth/meta/callback',
  '/api/webhooks/whatsapp',
  '/api/v1/auth/token',
  '/api/v1/docs',
  '/api/health',
  '/openapi.json',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/icon.svg',
  '/sw.js',
];

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    return new TextEncoder().encode('wayapp_dev_insecure_auth_secret_must_be_set_in_production_32bytes');
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and system routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return NextResponse.next();
  }

  // Allow public public assets explicitly
  if (
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css')
  ) {
    // Check if it is under uploads or protected media
    if (!pathname.startsWith('/api/media/') && !pathname.startsWith('/uploads/')) {
      return NextResponse.next();
    }
  }

  // 2. Allow API Key authentication for /api/v1 routes
  if (pathname.startsWith('/api/v1')) {
    const apiKeyHeader = request.headers.get('x-api-key');
    if (apiKeyHeader) {
      return NextResponse.next(); // Route handler will do SHA-256 validation against database
    }
  }

  // 3. Extract session token from cookie or Authorization header
  let sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7).trim();
    }
  }

  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Verify JWT token signature with jose
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(sessionToken, secret, {
      algorithms: ['HS256'],
    });

    if (!payload.userId || !payload.email) {
      throw new Error('Invalid JWT payload');
    }

    return NextResponse.next();
  } catch (error) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired session token' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'SESSION_EXPIRED');
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for Next.js internal static assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
