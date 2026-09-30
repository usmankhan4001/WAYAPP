import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';

// Any signed-in user reads and edits their own preferences only.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('response' in auth) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { developerMode: true },
  });
  return NextResponse.json({ developerMode: user?.developerMode ?? false });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('response' in auth) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.developerMode !== 'boolean') {
    return NextResponse.json({ error: 'developerMode must be true or false' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: auth.session.userId },
    data: { developerMode: body.developerMode },
    select: { developerMode: true },
  });
  return NextResponse.json({ developerMode: user.developerMode });
}
