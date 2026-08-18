import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/jwt';
import { isAllowedGccUser } from '@/lib/auth/session';
import { ensureDatabaseSchema } from '@/lib/db-init';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const body = await request.json();
    const { email, passcode } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Business email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Verify GCC Domain / Whitelist
    const isAllowed = await isAllowedGccUser(cleanEmail);
    if (!isAllowed) {
      return NextResponse.json(
        {
          error:
            'Access Restricted: Only authorized GCC Business users (@gccstartup.com or whitelisted emails) can access WAYAPP.',
        },
        { status: 403 }
      );
    }

    // 2. Resolve Role
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'SUPER_ADMIN' : 'MEMBER';

    // 3. Upsert User
    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        lastLoginAt: new Date(),
      },
      create: {
        email: cleanEmail,
        name: cleanEmail.split('@')[0].replace('.', ' '),
        role,
        lastLoginAt: new Date(),
      },
    });

    // 4. Sign JWT Token
    const sessionToken = signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name || 'GCC Member',
      avatarUrl: user.avatarUrl,
      role: user.role,
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

    // 5. Set Cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
