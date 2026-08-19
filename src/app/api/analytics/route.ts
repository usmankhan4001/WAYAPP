import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db-init';
import { requireAuth } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d'; // '7d', '30d', '90d', 'all'

    const now = new Date();
    let startDate = new Date();

    if (range === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === '90d') {
      startDate.setDate(now.getDate() - 90);
    } else if (range === 'all') {
      startDate = new Date(2020, 0, 1);
    } else {
      // Default 7d
      startDate.setDate(now.getDate() - 7);
    }

    // 1. Fetch campaigns and all individual campaign messages
    const campaigns = await prisma.campaign.findMany({
      include: {
        template: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const messages = await prisma.campaignMessage.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    // 2. Fetch 2-Way chat messages (inbound replies)
    const chatMessages = await prisma.chatMessage.findMany({
      where: {
        timestamp: {
          gte: startDate,
        },
      },
    });

    const totalContacts = await prisma.contact.count({ where: { status: 'ACTIVE' } });
    const totalGroups = await prisma.contactGroup.count();
    const totalTemplates = await prisma.template.count();

    // 3. Compute real metrics
    let totalSent = 0;
    let totalDelivered = 0;
    let totalRead = 0;
    let totalFailed = 0;
    let totalReplied = 0;

    messages.forEach((m) => {
      if (m.status === 'SENT' || m.status === 'DELIVERED' || m.status === 'READ') totalSent++;
      if (m.status === 'DELIVERED' || m.status === 'READ') totalDelivered++;
      if (m.status === 'READ') totalRead++;
      if (m.status === 'FAILED') totalFailed++;
    });

    // Count inbound customer replies
    const uniqueRepliedPhones = new Set<string>();
    chatMessages.forEach((cm) => {
      if (cm.direction === 'INBOUND') {
        totalReplied++;
        uniqueRepliedPhones.add(cm.phoneNumber);
      }
    });

    const totalTargeted = messages.length > 0 ? messages.length : campaigns.reduce((acc, c) => acc + c.totalContacts, 0);

    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0.0';
    const readRate = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0.0';
    const replyRate = totalDelivered > 0 ? ((uniqueRepliedPhones.size / (totalDelivered || 1)) * 100).toFixed(1) : '0.0';
    const failureRate = totalTargeted > 0 ? ((totalFailed / totalTargeted) * 100).toFixed(1) : '0.0';

    // 4. Build Conversion Funnel
    const funnel = [
      { name: 'Targeted Audience', count: totalTargeted, percentage: 100, color: '#64748b' },
      { name: 'Dispatched (Sent)', count: totalSent, percentage: totalTargeted > 0 ? Math.round((totalSent / totalTargeted) * 100) : 0, color: '#3b82f6' },
      { name: 'Delivered to Phone', count: totalDelivered, percentage: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0, color: '#10b981' },
      { name: 'Read / Opened (✓✓)', count: totalRead, percentage: totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0, color: '#0ea5e9' },
      { name: 'Inbound Replies', count: totalReplied, percentage: totalDelivered > 0 ? Math.round((totalReplied / totalDelivered) * 100) : 0, color: '#8b5cf6' },
    ];

    // 5. Build True Historical Daily Volume Timeseries
    const numDays = range === '30d' ? 30 : range === '90d' ? 90 : range === 'all' ? 30 : 7;
    const dailyVolume = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const label = numDays <= 7 ? (i === 0 ? 'Today' : daysOfWeek[d.getDay()]) : `${d.getMonth() + 1}/${d.getDate()}`;

      let daySent = 0;
      let dayDelivered = 0;
      let dayRead = 0;
      let dayFailed = 0;
      let dayReplied = 0;

      messages.forEach((m) => {
        const mDate = m.createdAt.toISOString().split('T')[0];
        if (mDate === dateKey) {
          if (m.status === 'SENT' || m.status === 'DELIVERED' || m.status === 'READ') daySent++;
          if (m.status === 'DELIVERED' || m.status === 'READ') dayDelivered++;
          if (m.status === 'READ') dayRead++;
          if (m.status === 'FAILED') dayFailed++;
        }
      });

      chatMessages.forEach((cm) => {
        const cmDate = cm.timestamp.toISOString().split('T')[0];
        if (cmDate === dateKey && cm.direction === 'INBOUND') {
          dayReplied++;
        }
      });

      dailyVolume.push({
        date: label,
        fullDate: dateKey,
        sent: daySent,
        delivered: dayDelivered,
        read: dayRead,
        failed: dayFailed,
        replied: dayReplied,
      });
    }

    // 6. Failure Reason Breakdown
    const failedMessages = messages.filter((m) => m.status === 'FAILED');
    const errorCounts: Record<string, { code: string; reason: string; count: number }> = {};

    failedMessages.forEach((m) => {
      const code = m.errorCode || '131026';
      const reason = m.errorMessage || 'Message undeliverable / Number not on WhatsApp';
      if (!errorCounts[code]) {
        errorCounts[code] = { code, reason, count: 0 };
      }
      errorCounts[code].count++;
    });

    // 7. Conversation Categories (Marketing vs Utility vs Service)
    const categoryCounts: Record<string, number> = {
      MARKETING: 0,
      UTILITY: 0,
      AUTHENTICATION: 0,
      SERVICE: chatMessages.filter((c) => c.direction === 'INBOUND').length,
    };

    campaigns.forEach((c) => {
      const cat = c.template?.category || 'MARKETING';
      if (categoryCounts[cat] !== undefined) {
        categoryCounts[cat] += c.sentCount;
      }
    });

    return NextResponse.json({
      range,
      summary: {
        totalContacts,
        totalGroups,
        totalTemplates,
        totalCampaigns: campaigns.length,
        totalMessages: totalTargeted,
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
      categoryCounts,
      errorBreakdown: Object.values(errorCounts),
      recentCampaigns: campaigns.slice(0, 5),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
