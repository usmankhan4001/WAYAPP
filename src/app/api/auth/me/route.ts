import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        avatarUrl: session.avatarUrl,
        role: session.role,
      },
    });
  }
}
