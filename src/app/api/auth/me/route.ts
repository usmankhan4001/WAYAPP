import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db-init';

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
  } catch {}

  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  let user = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
  } catch {}

  return NextResponse.json({
    authenticated: true,
    user: user || session,
  });
}
