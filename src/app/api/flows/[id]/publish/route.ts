import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const publish = body.publish !== false; // true = publish, false = unpublish

    const flow = await prisma.flow.findUnique({ where: { id } });
    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    if (publish) {
      // Validate that flow has at least one trigger node
      let nodes = [];
      try {
        nodes = JSON.parse(flow.nodesJson || '[]');
      } catch {}

      if (nodes.length === 0) {
        return NextResponse.json({ error: 'Cannot publish an empty flow' }, { status: 400 });
      }

      const updated = await prisma.flow.update({
        where: { id },
        data: { status: 'PUBLISHED' },
      });

      return NextResponse.json({ success: true, status: 'PUBLISHED', flow: updated });
    } else {
      const updated = await prisma.flow.update({
        where: { id },
        data: { status: 'DRAFT' },
      });

      return NextResponse.json({ success: true, status: 'DRAFT', flow: updated });
    }
  } catch (error: any) {
    logger.error({ error }, 'Error publishing flow');
    return NextResponse.json({ error: 'Failed to update flow publish state' }, { status: 500 });
  }
}
