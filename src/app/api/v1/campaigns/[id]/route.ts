import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateApiRequest(request, 'campaigns:read');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        template: true,
        _count: { select: { messages: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const deliveryRate = campaign.sentCount > 0
      ? ((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1)
      : '0.0';
    const readRate = campaign.deliveredCount > 0
      ? ((campaign.readCount / campaign.deliveredCount) * 100).toFixed(1)
      : '0.0';
    const replyRate = campaign.deliveredCount > 0
      ? ((campaign.repliedCount / campaign.deliveredCount) * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      ...campaign,
      analytics: {
        deliveryRatePercentage: Number(deliveryRate),
        readRatePercentage: Number(readRate),
        replyRatePercentage: Number(replyRate),
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 campaign get');
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}
