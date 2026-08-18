import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    await prisma.webhookEndpoint.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Webhook endpoint deleted' });
  } catch (error: any) {
    logger.error({ error }, 'Error deleting webhook endpoint');
    return NextResponse.json({ error: 'Failed to delete endpoint' }, { status: 500 });
  }
}
