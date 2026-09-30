import { describe, it, expect } from 'vitest'
import { buildNotifications, groupNotifications, relativeTime, unreadBadgeLabel } from '@/lib/notifications/build'

const now = new Date('2026-09-30T15:00:00')
const ago = (h: number) => new Date(now.getTime() - h * 3600_000)
const empty = { unreadConversations: [], failedMessages: [], completedCampaigns: [], templates: [], disconnected: false }

describe('buildNotifications', () => {
  it('orders newest first and links to the right screen', () => {
    const out = buildNotifications(
      {
        ...empty,
        unreadConversations: [{ contactId: 'c1', name: 'Sara', unreadCount: 2, at: ago(3) }],
        completedCampaigns: [{ id: 'b1', name: 'Eid offer', at: ago(1) }],
        templates: [{ id: 't1', name: 'welcome', status: 'REJECTED', at: ago(5) }],
      },
      now
    )
    expect(out.map((i) => i.kind)).toEqual(['broadcast', 'message', 'template_rejected'])
    expect(out.map((i) => i.href)).toEqual(['/campaigns/b1', '/inbox?contactId=c1', '/templates'])
    expect(out[1].text).toBe('Sara sent you 2 new messages.')
  })

  it('drops failed messages older than 24 hours and keeps newer ones', () => {
    const out = buildNotifications(
      {
        ...empty,
        failedMessages: [
          { id: 'm1', contactId: 'c1', name: 'Sara', at: ago(23) },
          { id: 'm2', contactId: 'c2', name: 'Omar', at: ago(25) },
        ],
      },
      now
    )
    expect(out.map((i) => i.id)).toEqual(['failed:m1'])
  })

  it('ignores pending templates, zero-unread chats and old broadcasts', () => {
    const out = buildNotifications(
      {
        ...empty,
        unreadConversations: [{ contactId: 'c1', name: 'Sara', unreadCount: 0, at: ago(1) }],
        completedCampaigns: [{ id: 'b1', name: 'Old', at: ago(24 * 8) }],
        templates: [{ id: 't1', name: 'x', status: 'PENDING', at: ago(1) }],
      },
      now
    )
    expect(out).toEqual([])
  })

  it('adds a connection item only when disconnected', () => {
    expect(buildNotifications({ ...empty, disconnected: true }, now).map((i) => i.href)).toEqual(['/settings'])
    expect(buildNotifications(empty, now)).toEqual([])
  })
})

describe('groupNotifications', () => {
  const items = buildNotifications(
    {
      ...empty,
      unreadConversations: [{ contactId: 'c1', name: 'Sara', unreadCount: 1, at: ago(1) }],
      completedCampaigns: [{ id: 'b1', name: 'Eid', at: ago(20) }],
    },
    now
  )

  it('splits Today and Earlier at local midnight', () => {
    const g = groupNotifications(items, now, 0)
    expect(g.today.map((r) => r.id)).toEqual(['message:c1'])
    expect(g.earlier.map((r) => r.id)).toEqual(['broadcast:b1'])
  })

  it('marks unread relative to the last read time', () => {
    expect(groupNotifications(items, now, 0).unreadCount).toBe(2)
    const g = groupNotifications(items, now, ago(0.5).getTime())
    expect(g.today[0].unread).toBe(false)
    expect(g.unreadCount).toBe(0)
    expect(groupNotifications(items, now, ago(30).getTime()).unreadCount).toBe(2)
  })
})

describe('formatting', () => {
  it('relative time', () => {
    expect(relativeTime(ago(0), now)).toBe('Just now')
    expect(relativeTime(new Date(now.getTime() - 5 * 60000), now)).toBe('5 min ago')
    expect(relativeTime(ago(3), now)).toBe('3 h ago')
    expect(relativeTime(ago(30), now)).toBe('Yesterday')
  })
  it('badge caps at 9+', () => {
    expect(unreadBadgeLabel(3)).toBe('3')
    expect(unreadBadgeLabel(12)).toBe('9+')
  })
})
