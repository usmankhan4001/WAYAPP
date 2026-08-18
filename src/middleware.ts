import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public routes that do not require authentication
 */
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/meta',
  '/api/auth/meta/callback',
  '/api/webhooks/whatsapp',
  '/favicon.svg',
  '/manifest.json',
  '/sw.js',
];

/**
 * Validates HMAC SHA-256 JWT in Edge Runtime
 */
async function verifyJwtInEdge(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    // Decode payload
    let b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const payload = JSON.parse(atob(b64));

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null; // Expired
    }

    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      let sigB64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
      while (sigB64.length % 4) sigB64 += '=';
      const sigStr = atob(sigB64);
      const sigBuf = new Uint8Array(sigStr.length);
      for (let i = 0; i < sigStr.length; i++) {
        sigBuf[i] = sigStr.charCodeAt(i);
      }

      const isValid = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(data));
      if (!isValid) return null;
    } catch {
      if (!payload.userId || !payload.email) return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and system routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // 2. Extract session token from cookie
  const sessionToken = request.cookies.get('wayapp_session')?.value;
  const secret =
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    'wayapp_gcc_jwt_secret_key_2026_enterprise';

  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verify JWT token signature
  const payload = await verifyJwtInEdge(sessionToken, secret);

  if (!payload || !payload.email) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'SESSION_EXPIRED');
    return NextResponse.redirect(loginUrl);
  }

  // 4. Verification successful: allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
