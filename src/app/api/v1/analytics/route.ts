import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'analytics:read');
  if ('response' in authResult) return authResult.response;

  try {
    const [
      totalContacts,
      activeContacts,
      unsubscribedContacts,
      totalCampaigns,
      totalMessagesSent,
      totalInboundMessages,
      openConversations,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { status: 'ACTIVE' } }),
      prisma.contact.count({ where: { status: 'UNSUBSCRIBED' } }),
      prisma.campaign.count(),
      prisma.chatMessage.count({ where: { direction: 'OUTBOUND' } }),
      prisma.chatMessage.count({ where: { direction: 'INBOUND' } }),
      prisma.conversation.count({ where: { status: 'OPEN' } }),
    ]);

    // Aggregate campaign metrics
    const campaignAgg = await prisma.campaign.aggregate({
      _sum: {
        sentCount: true,
        deliveredCount: true,
        readCount: true,
        repliedCount: true,
        failedCount: true,
      },
    });

    const totalSent = campaignAgg._sum.sentCount || 0;
    const totalDelivered = campaignAgg._sum.deliveredCount || 0;
    const totalRead = campaignAgg._sum.readCount || 0;
    const totalReplied = campaignAgg._sum.repliedCount || 0;

    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '100.0';
    const readRate = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0.0';
    const replyRate = totalDelivered > 0 ? ((totalReplied / totalDelivered) * 100).toFixed(1) : '0.0';

    return NextResponse.json({
      overview: {
        totalContacts,
        activeContacts,
        unsubscribedContacts,
        totalCampaigns,
        openConversations,
        totalMessagesSent,
        totalInboundMessages,
      },
      broadcastPerformance: {
        totalSent,
        totalDelivered,
        totalRead,
        totalReplied,
        deliveryRatePercentage: Number(deliveryRate),
        readRatePercentage: Number(readRate),
        replyRatePercentage: Number(replyRate),
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 analytics summary');
    return NextResponse.json({ error: 'Failed to retrieve analytics' }, { status: 500 });
  }
}
