// Small pure helpers shared by the chat list and the chat screen.

export type TickState = 'sent' | 'delivered' | 'read' | 'failed'

export function tickState(status?: string | null): TickState {
  if (status === 'READ') return 'read'
  if (status === 'DELIVERED') return 'delivered'
  if (status === 'FAILED') return 'failed'
  return 'sent'
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "Today", "Yesterday", or a short date, for the chips between days. */
export function dayLabel(date: Date, now: Date = new Date()): string {
  if (sameDay(date, now)) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

export function timeLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** Plain words for the chat header, from the reply-window state. */
export function replyStatusLine(windowOpen: boolean): string {
  return windowOpen ? 'You can reply freely' : 'Use a template to reply'
}

/** One-line text for a quote bar or a chat-list preview. */
export function messagePreview(m?: { body?: string | null; messageType?: string | null } | null): string {
  if (!m) return 'Original message'
  if (m.body && m.body.trim()) return m.body
  const labels: Record<string, string> = {
    image: 'Photo',
    video: 'Video',
    audio: 'Voice message',
    voice: 'Voice message',
    document: 'Document',
  }
  return labels[m.messageType || ''] || 'Message'
}

export type ListFilter = 'all' | 'unread' | 'waiting' | 'archived'

export const LIST_FILTERS: { value: ListFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'waiting', label: 'Waiting on me' },
  { value: 'archived', label: 'Archived' },
]
