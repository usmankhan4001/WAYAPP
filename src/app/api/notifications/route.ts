import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/rbac'
import { buildNotifications, FAILED_WINDOW_MS, RECENT_WINDOW_MS } from '@/lib/notifications/build'

export const dynamic = 'force-dynamic'

const nameOf = (c: { firstName: string | null; lastName: string | null; phoneNumber: string }) =>
  `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.phoneNumber

// Any signed-in user. Everything is computed from existing rows; nothing is stored.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('response' in auth) return auth.response
  try {
    const now = new Date()
    const contactSelect = { select: { firstName: true, lastName: true, phoneNumber: true } }
    const [convos, failed, campaigns, templates, settings] = await Promise.all([
      prisma.conversation.findMany({
        where: { unreadCount: { gt: 0 }, archived: false },
        orderBy: { lastMessageAt: 'desc' },
        take: 20,
        select: { contactId: true, unreadCount: true, lastMessageAt: true, contact: contactSelect },
      }),
      prisma.chatMessage.findMany({
        where: { direction: 'OUTBOUND', status: 'FAILED', timestamp: { gte: new Date(now.getTime() - FAILED_WINDOW_MS) } },
        orderBy: { timestamp: 'desc' },
        take: 20,
        select: { id: true, contactId: true, timestamp: true, contact: contactSelect },
      }),
      prisma.campaign.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: new Date(now.getTime() - RECENT_WINDOW_MS) } },
        orderBy: { completedAt: 'desc' },
        take: 10,
        select: { id: true, name: true, completedAt: true },
      }),
      prisma.template.findMany({
        where: { status: { in: ['APPROVED', 'REJECTED'] }, updatedAt: { gte: new Date(now.getTime() - RECENT_WINDOW_MS) } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, name: true, status: true, updatedAt: true },
      }),
      prisma.settings.findFirst({ select: { isConnected: true, phoneNumberId: true, updatedAt: true } }),
    ])

    const items = buildNotifications(
      {
        unreadConversations: convos.map((c) => ({
          contactId: c.contactId,
          name: nameOf(c.contact),
          unreadCount: c.unreadCount,
          at: c.lastMessageAt,
        })),
        failedMessages: failed.map((m) => ({ id: m.id, contactId: m.contactId, name: nameOf(m.contact), at: m.timestamp })),
        completedCampaigns: campaigns.flatMap((c) => (c.completedAt ? [{ id: c.id, name: c.name, at: c.completedAt }] : [])),
        templates: templates.map((t) => ({ id: t.id, name: t.name, status: t.status, at: t.updatedAt })),
        disconnected: !settings?.isConnected,
        disconnectedSince: settings?.updatedAt ?? null,
      },
      now
    )
    return NextResponse.json({ items, now: now.toISOString() })
  } catch (error) {
    console.error('Notifications failed', error)
    return NextResponse.json({ error: 'Could not load notifications. Try again.' }, { status: 500 })
  }
}
