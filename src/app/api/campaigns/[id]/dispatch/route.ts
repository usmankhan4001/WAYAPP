import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CampaignDispatcher } from '@/lib/whatsapp/queue';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body; // START, PAUSE, RESUME, CANCEL

    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (action === 'START' || action === 'RESUME') {
      await prisma.campaign.update({
        where: { id },
        data: { status: 'QUEUED' },
      });

      CampaignDispatcher.startCampaign(id).catch((err) => {
        console.error('Error in campaign dispatch:', err);
      });

      return NextResponse.json({ success: true, status: 'QUEUED' });
    }

    if (action === 'PAUSE') {
      await prisma.campaign.update({
        where: { id },
        data: { status: 'PAUSED' },
      });
      return NextResponse.json({ success: true, status: 'PAUSED' });
    }

    if (action === 'CANCEL') {
      await prisma.campaign.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ success: true, status: 'CANCELLED' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
