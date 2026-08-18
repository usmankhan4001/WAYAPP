import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const flow = await prisma.flow.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { enteredAt: 'desc' },
          take: 10,
          include: { contact: true },
        },
      },
    });

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    return NextResponse.json(flow);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching flow');
    return NextResponse.json({ error: 'Failed to retrieve flow' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, startNodeId, nodesJson, edgesJson } = body;

    const updated = await prisma.flow.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(status ? { status } : {}),
        ...(startNodeId !== undefined ? { startNodeId } : {}),
        ...(nodesJson !== undefined ? { nodesJson } : {}),
        ...(edgesJson !== undefined ? { edgesJson } : {}),
        version: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true, flow: updated });
  } catch (error: any) {
    logger.error({ error }, 'Error updating flow');
    return NextResponse.json({ error: 'Failed to update flow' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    await prisma.flow.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Flow deleted successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Error deleting flow');
    return NextResponse.json({ error: 'Failed to delete flow' }, { status: 500 });
  }
}
