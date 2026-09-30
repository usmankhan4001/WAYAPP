/**
 * Pure logic for the notification centre: turns raw rows into plain-sentence items,
 * groups them (Today / Earlier) and works out what is unread. No I/O, so it is unit tested.
 */
import { plainName } from '@/lib/templates/present';

export type NotificationKind =
  | 'message'
  | 'failed'
  | 'broadcast'
  | 'template_approved'
  | 'template_rejected'
  | 'connection'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  /** one plain sentence */
  text: string
  /** ISO timestamp */
  at: string
  /** the screen a tap opens */
  href: string
}

export interface NotificationSource {
  unreadConversations: { contactId: string; name: string; unreadCount: number; at: Date | string }[]
  failedMessages: { id: string; contactId: string; name: string; at: Date | string }[]
  completedCampaigns: { id: string; name: string; at: Date | string }[]
  templates: { id: string; name: string; status: string; at: Date | string }[]
  disconnected: boolean
  /** when the connection problem started, if known (otherwise it counts as new now) */
  disconnectedSince?: Date | string | null
}

export const FAILED_WINDOW_MS = 24 * 60 * 60 * 1000
export const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const MAX_ITEMS = 50

const ms = (d: Date | string) => new Date(d).getTime()

export function buildNotifications(src: NotificationSource, now: Date = new Date()): NotificationItem[] {
  const t = now.getTime()
  const items: NotificationItem[] = []

  for (const c of src.unreadConversations) {
    if (c.unreadCount <= 0) continue
    items.push({
      id: `message:${c.contactId}`,
      kind: 'message',
      text:
        c.unreadCount > 1
          ? `${c.name} sent you ${c.unreadCount} new messages.`
          : `${c.name} sent you a new message.`,
      at: new Date(c.at).toISOString(),
      href: `/inbox?contactId=${c.contactId}`,
    })
  }

  for (const m of src.failedMessages) {
    if (t - ms(m.at) > FAILED_WINDOW_MS) continue
    items.push({
      id: `failed:${m.id}`,
      kind: 'failed',
      text: `Your message to ${m.name} could not be sent.`,
      at: new Date(m.at).toISOString(),
      href: `/inbox?contactId=${m.contactId}`,
    })
  }

  for (const c of src.completedCampaigns) {
    if (t - ms(c.at) > RECENT_WINDOW_MS) continue
    items.push({
      id: `broadcast:${c.id}`,
      kind: 'broadcast',
      text: `Your broadcast "${c.name}" has finished sending.`,
      at: new Date(c.at).toISOString(),
      href: `/campaigns/${c.id}`,
    })
  }

  for (const tpl of src.templates) {
    if (t - ms(tpl.at) > RECENT_WINDOW_MS) continue
    const status = tpl.status.toUpperCase()
    if (status !== 'APPROVED' && status !== 'REJECTED') continue
    items.push({
      id: `template:${tpl.id}:${status}`,
      kind: status === 'APPROVED' ? 'template_approved' : 'template_rejected',
      text:
        status === 'APPROVED'
          ? `Your template "${plainName(tpl.name)}" was approved.`
          : `Your template "${plainName(tpl.name)}" was rejected. Open it to see why.`,
      at: new Date(tpl.at).toISOString(),
      href: '/templates',
    })
  }

  if (src.disconnected) {
    items.push({
      id: 'connection',
      kind: 'connection',
      text: 'WhatsApp is not connected. Connect your number to send and receive messages.',
      at: new Date(src.disconnectedSince ?? now).toISOString(),
      href: '/settings',
    })
  }

  return items.sort((a, b) => ms(b.at) - ms(a.at)).slice(0, MAX_ITEMS)
}

export interface NotificationRow extends NotificationItem {
  unread: boolean
}

export interface NotificationGroups {
  today: NotificationRow[]
  earlier: NotificationRow[]
  unreadCount: number
}

/** lastReadAt = the moment "Mark all as read" was last pressed (ms since epoch, 0 if never). */
export function groupNotifications(items: NotificationItem[], now: Date, lastReadAt: number): NotificationGroups {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const today: NotificationRow[] = []
  const earlier: NotificationRow[] = []
  let unreadCount = 0
  const ordered = [...items].sort((a, b) => ms(b.at) - ms(a.at))
  for (const item of ordered) {
    const unread = ms(item.at) > lastReadAt
    if (unread) unreadCount++
    const row = { ...item, unread }
    if (ms(item.at) >= startOfToday.getTime()) today.push(row)
    else earlier.push(row)
  }
  return { today, earlier, unreadCount }
}

export function relativeTime(iso: string | Date, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - ms(iso))
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} h ago`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'Yesterday'
  if (day < 7) return `${day} days ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function unreadBadgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count)
}
