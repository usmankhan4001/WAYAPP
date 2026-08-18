import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const flows = await prisma.flow.findMany({
      include: {
        _count: { select: { runs: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(flows);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching flows');
    return NextResponse.json({ error: 'Failed to retrieve flows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  const { session } = authResult;

  try {
    const body = await request.json();
    const { name, description, nodesJson, edgesJson } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Flow name is required' }, { status: 400 });
    }

    const initialNodes = nodesJson || JSON.stringify([
      {
        id: 'start_1',
        type: 'trigger',
        data: { label: 'Start Flow', type: 'ANY_INBOUND' },
        position: { x: 250, y: 50 },
      },
      {
        id: 'msg_1',
        type: 'message',
        data: { label: 'Welcome Message', text: 'Hello {{firstName}}! How can we help you today?' },
        position: { x: 250, y: 180 },
      },
    ]);

    const initialEdges = edgesJson || JSON.stringify([
      { id: 'e1', source: 'start_1', target: 'msg_1' },
    ]);

    const flow = await prisma.flow.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: 'DRAFT',
        startNodeId: 'start_1',
        nodesJson: initialNodes,
        edgesJson: initialEdges,
        createdBy: session.userId,
      },
    });

    return NextResponse.json({ success: true, flow });
  } catch (error: any) {
    logger.error({ error }, 'Error creating flow');
    return NextResponse.json({ error: 'Failed to create flow' }, { status: 500 });
  }
}
