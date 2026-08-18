import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        template: true,
        messages: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalContacts = await prisma.contact.count({ where: { status: 'ACTIVE' } });
    const totalGroups = await prisma.contactGroup.count();
    const totalTemplates = await prisma.template.count();

    // Real Aggregations
    let totalMessages = 0;
    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalReplied = 0;
    let totalFailed = 0;

    campaigns.forEach((c) => {
      totalMessages += c.totalContacts;
      totalSent += c.sentCount;
      totalDelivered += c.deliveredCount;
      totalRead += c.readCount;
      totalReplied += c.repliedCount;
      totalFailed += c.failedCount;
    });

    // Real Delivery & engagement rates
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0.0';
    const readRate = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0.0';
    const replyRate = totalDelivered > 0 ? ((totalReplied / totalDelivered) * 100).toFixed(1) : '0.0';
    const failureRate = totalMessages > 0 ? ((totalFailed / totalMessages) * 100).toFixed(1) : '0.0';

    // Funnel Steps
    const funnel = [
      { name: 'Targeted', count: totalMessages, percentage: totalMessages > 0 ? 100 : 0, color: '#64748b' },
      { name: 'Sent', count: totalSent, percentage: totalMessages > 0 ? Math.round((totalSent / totalMessages) * 100) : 0, color: '#3b82f6' },
      { name: 'Delivered', count: totalDelivered, percentage: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0, color: '#10b981' },
      { name: 'Opened / Read', count: totalRead, percentage: totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0, color: '#0ea5e9' },
      { name: 'Replied', count: totalReplied, percentage: totalDelivered > 0 ? Math.round((totalReplied / totalDelivered) * 100) : 0, color: '#8b5cf6' },
    ];

    // Failure reason breakdown
    const failedMessages = await prisma.campaignMessage.findMany({
      where: { status: 'FAILED' },
      select: { errorCode: true, errorMessage: true },
      take: 50,
    });

    const errorCounts: Record<string, { code: string; reason: string; count: number }> = {};
    failedMessages.forEach((m) => {
      const code = m.errorCode || 'UNKNOWN';
      const reason = m.errorMessage || 'Undeliverable message';
      if (!errorCounts[code]) {
        errorCounts[code] = { code, reason, count: 0 };
      }
      errorCounts[code].count++;
    });

    // Real dynamic daily volume calculation for past 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const dailyVolume = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = i === 0 ? 'Today' : days[d.getDay()];

      // Filter messages on that date
      const dString = d.toISOString().split('T')[0];
      let daySent = 0;
      let dayDelivered = 0;
      let dayRead = 0;
      let dayReplied = 0;

      campaigns.forEach((c) => {
        const cDate = c.createdAt.toISOString().split('T')[0];
        if (cDate === dString) {
          daySent += c.sentCount;
          dayDelivered += c.deliveredCount;
          dayRead += c.readCount;
          dayReplied += c.repliedCount;
        }
      });

      dailyVolume.push({
        date: dayName,
        sent: daySent,
        delivered: dayDelivered,
        read: dayRead,
        replied: dayReplied,
      });
    }

    return NextResponse.json({
      summary: {
        totalContacts,
        totalGroups,
        totalTemplates,
        totalCampaigns: campaigns.length,
        totalMessages,
        totalSent,
        totalDelivered,
        totalRead,
        totalReplied,
        totalFailed,
        deliveryRate,
        readRate,
        replyRate,
        failureRate,
      },
      funnel,
      dailyVolume,
      errorBreakdown: Object.values(errorCounts),
      recentCampaigns: campaigns.slice(0, 5),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
