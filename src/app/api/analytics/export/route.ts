import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';

/**
 * GET /api/analytics/export — Export analytics data as CSV
 * Query params: range=7d|30d|90d|all, type=campaigns|messages
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const exportType = searchParams.get('type') || 'campaigns';

    const now = new Date();
    let startDate = new Date();

    if (range === '30d') startDate.setDate(now.getDate() - 30);
    else if (range === '90d') startDate.setDate(now.getDate() - 90);
    else if (range === 'all') startDate = new Date(2020, 0, 1);
    else startDate.setDate(now.getDate() - 7);

    if (exportType === 'messages') {
      // Export campaign messages with status tracking
      const messages = await prisma.campaignMessage.findMany({
        where: { createdAt: { gte: startDate } },
        include: {
          campaign: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50000, // Safety cap
      });

      const headers = ['Campaign', 'Phone', 'Contact Name', 'Status', 'Channel', 'Sent At', 'Delivered At', 'Read At', 'Replied At', 'Failed At', 'Error Code', 'Error Message'];
      const rows = messages.map((m) => [
        m.campaign?.name || '',
        m.phoneNumber,
        `${m.contact?.firstName || ''} ${m.contact?.lastName || ''}`.trim() || 'Unknown',
        m.status,
        m.channel,
        m.sentAt?.toISOString() || '',
        m.deliveredAt?.toISOString() || '',
        m.readAt?.toISOString() || '',
        m.repliedAt?.toISOString() || '',
        m.failedAt?.toISOString() || '',
        m.errorCode || '',
        m.errorMessage || '',
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="wayapp_messages_${range}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Default: Export campaign summary
    const campaigns = await prisma.campaign.findMany({
      where: { createdAt: { gte: startDate } },
      include: { template: { select: { name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Campaign Name', 'Template', 'Category', 'Status', 'Total Contacts', 'Sent', 'Delivered', 'Read', 'Replied', 'Failed', 'Delivery Rate', 'Read Rate', 'Created At', 'Completed At'];
    const rows = campaigns.map((c) => {
      const deliveryRate = c.sentCount > 0 ? ((c.deliveredCount / c.sentCount) * 100).toFixed(1) + '%' : '0%';
      const readRate = c.deliveredCount > 0 ? ((c.readCount / c.deliveredCount) * 100).toFixed(1) + '%' : '0%';
      return [
        c.name,
        c.template?.name || '',
        c.template?.category || '',
        c.status,
        c.totalContacts,
        c.sentCount,
        c.deliveredCount,
        c.readCount,
        c.repliedCount,
        c.failedCount,
        deliveryRate,
        readRate,
        c.createdAt.toISOString(),
        c.completedAt?.toISOString() || '',
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="wayapp_campaigns_${range}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
