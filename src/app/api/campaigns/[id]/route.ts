import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        template: true,
        messages: {
          include: {
            contact: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Calculate conversion rates
    const total = campaign.totalContacts || 1;
    const sent = campaign.sentCount;
    const delivered = campaign.deliveredCount;
    const read = campaign.readCount;
    const replied = campaign.repliedCount;
    const failed = campaign.failedCount;

    const stats = {
      total,
      sent,
      delivered,
      read,
      replied,
      failed,
      deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : '0',
      readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(1) : '0',
      replyRate: delivered > 0 ? ((replied / delivered) * 100).toFixed(1) : '0',
      failureRate: total > 0 ? ((failed / total) * 100).toFixed(1) : '0',
    };

    return NextResponse.json({ campaign, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
