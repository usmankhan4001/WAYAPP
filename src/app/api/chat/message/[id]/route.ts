import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Editing message history is ADMIN-only: bare requireAuth previously allowed any
  // MEMBER/VIEWER to alter the permanent chat record.
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const { body } = await request.json();

    if (!body || typeof body !== 'string') {
      return NextResponse.json(
        { error: 'Valid message body is required for editing.' },
        { status: 400 }
      );
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    }

    const updatedMessage = await prisma.chatMessage.update({
      where: { id },
      data: { body: body.trim() },
    });

    return NextResponse.json({ success: true, message: updatedMessage });
  } catch (error: any) {
    logger.error({ error }, 'Error editing chat message');
    return NextResponse.json(
      { error: 'Failed to edit message.' },
      { status: 500 }
    );
  }
}
