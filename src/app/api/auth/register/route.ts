import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/jwt';
import { isAllowedUser } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const RegisterSchema = z.object({
  email: z.string().email('Valid email address is required').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(1, 'Full name is required').trim(),
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`register:${clientIp}`, { limit: 5, windowSeconds: 60 });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many registration requests. Please wait.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = RegisterSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { email, password, name } = parseResult.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    // Check total user count to determine if this is the first bootstrap user
    const totalUsers = await prisma.user.count();
    const isFirstUser = totalUsers === 0;

    // Registration kill switch: only the very first bootstrap user may register
    // freely. Afterwards, AuthConfig.allowRegistration must be explicitly true.
    // Previously the flag was never checked, so every deployment with open network
    // access grew active MEMBER accounts at will.
    const authConfig = await prisma.authConfig.findUnique({ where: { id: 'default' } });
    if (!isFirstUser && authConfig?.allowRegistration === false) {
      logger.warn({ email }, 'Registration rejected: allowRegistration is disabled');
      return NextResponse.json(
        { error: 'Registration is disabled on this instance.' },
        { status: 403 }
      );
    }

    // If not first user, check domain / authorization whitelist
    if (!isFirstUser) {
      const isAllowed = await isAllowedUser(email);
      if (!isAllowed) {
        return NextResponse.json(
          {
            error: 'Registration restricted: Only authorized enterprise domain users can register.',
          },
          { status: 403 }
        );
      }
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12);
    const role = isFirstUser ? 'SUPER_ADMIN' : 'MEMBER';

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        status: 'ACTIVE',
        isActive: true,
        lastLoginAt: new Date(),
      },
    });

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        id: sessionId,
        sessionToken: sessionId,
        userId: newUser.id,
        expiresAt,
        userAgent: request.headers.get('user-agent') || 'unknown',
        ipAddress: clientIp,
      },
    });

    const sessionToken = await signSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name || newUser.email.split('@')[0],
      avatarUrl: newUser.avatarUrl,
      role: newUser.role,
      jti: sessionId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[Auth API] Registration error:', error);
    return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
  }
}
