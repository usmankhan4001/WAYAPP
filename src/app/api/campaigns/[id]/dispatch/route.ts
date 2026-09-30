import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { campaignDispatchEnabled } from '@/lib/feature-gates';
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
      // Sending is held unless CAMPAIGN_DISPATCH=on (src/lib/feature-gates.ts). While held this is a
      // 409 and nothing changes. When on, the campaign is handed to the worker's scheduler (polls
      // every 15s) rather than sent from this web request: the worker path re-checks the gate,
      // resolves the audience through the single resolver and is what Pause/Cancel interrupt.
      if (!campaignDispatchEnabled()) {
        return NextResponse.json({ error: 'Sending is switched off for this account.' }, { status: 409 });
      }
      const template = await prisma.template.findUnique({ where: { id: campaign.templateId }, select: { status: true } });
      if (template?.status !== 'APPROVED') {
        return NextResponse.json({ error: 'This message has not been approved by Meta, so it cannot be sent.' }, { status: 400 });
      }
      const queued = await prisma.campaign.updateMany({
        where: { id, status: { in: ['DRAFT', 'PAUSED', 'SCHEDULED'] } },
        data: { status: 'SCHEDULED', scheduledAt: new Date() },
      });
      if (queued.count === 0) {
        return NextResponse.json({ error: 'This broadcast cannot be started from its current state.' }, { status: 409 });
      }
      return NextResponse.json({ success: true, status: 'SCHEDULED' });
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
