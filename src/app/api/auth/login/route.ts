import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/jwt';
import { isAllowedGccUser } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const LoginSchema = z.object({
  email: z.string().email('Valid email address is required').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting: 5 attempts per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`login:${clientIp}`, { limit: 10, windowSeconds: 60 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 1 minute before trying again.' },
        { status: 429 }
      );
    }

    // 2. Validate Request Body
    const body = await request.json().catch(() => ({}));
    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid login payload' },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // 3. Look up user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Check if DB is completely empty (bootstrap condition)
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        return NextResponse.json(
          {
            error: 'No accounts configured. Please complete first-time registration as Super Admin.',
            needsRegistration: true,
          },
          { status: 404 }
        );
      }

      // Timing attack mitigation: do dummy hash comparison
      await bcrypt.compare(password, '$2a$12$e8YdC0fP5kS.yX4E4jWwUe1R.t/VqXpC8oWj7nKqG9L4hN9vN1/Gy');
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive || user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Account suspended. Please contact your system administrator.' },
        { status: 403 }
      );
    }

    // 4. Verify password
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error: 'Password not set for this account. Please use password reset or OAuth.',
        },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 5. Create Session in DB (Revocable Session Table)
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.session.create({
      data: {
        id: sessionId,
        sessionToken: sessionId,
        userId: user.id,
        expiresAt,
        userAgent: request.headers.get('user-agent') || 'unknown',
        ipAddress: clientIp,
      },
    });

    // 6. Update user's last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 7. Sign JWT with jti
    const sessionToken = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      avatarUrl: user.avatarUrl,
      role: user.role,
      jti: sessionId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // 8. Set HTTP-only, Secure Cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[Auth API] Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
