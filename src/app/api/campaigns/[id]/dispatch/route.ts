import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { dispatchCampaign } from '@/worker/dispatcher';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. RBAC Check: Admins only
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action } = body; // START, PAUSE, RESUME, CANCEL

    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (action === 'START' || action === 'RESUME') {
      const lock = await prisma.campaign.updateMany({
        where: {
          id,
          status: { in: ['DRAFT', 'PAUSED', 'QUEUED', 'SCHEDULED', 'RUNNING'] },
        },
        data: { status: 'QUEUED' },
      });

      if (lock.count === 0) {
        return NextResponse.json(
          { error: `Cannot start campaign with status: ${campaign.status}` },
          { status: 400 }
        );
      }

      // Asynchronously trigger dispatcher
      dispatchCampaign(id).catch((err) => {
        logger.error({ campaignId: id, err }, 'Campaign dispatch error');
      });

      return NextResponse.json({ success: true, status: 'QUEUED' });
    }

    if (action === 'PAUSE') {
      await prisma.campaign.updateMany({
        where: { id, status: { in: ['QUEUED', 'RUNNING'] } },
        data: { status: 'PAUSED' },
      });
      return NextResponse.json({ success: true, status: 'PAUSED' });
    }

    if (action === 'CANCEL') {
      await prisma.campaign.updateMany({
        where: { id, status: { in: ['DRAFT', 'SCHEDULED', 'QUEUED', 'RUNNING', 'PAUSED'] } },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ success: true, status: 'CANCELLED' });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    logger.error({ error }, 'Error in campaign dispatch route');
    return NextResponse.json({ error: 'Failed to process campaign action' }, { status: 500 });
  }
}
