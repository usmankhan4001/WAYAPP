'use client'

import React from 'react'
import { Archive, ArchiveRestore, Check, CheckCheck, MailOpen, MoreVertical, Pin, PinOff, VolumeX } from 'lucide-react'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/icon-button'
import { ListRow } from '@/components/ui/list-row'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { cn } from '@/lib/utils'
import { formatTimeAgo } from '@/lib/utils'
import { messagePreview, tickState } from './chat-utils'

export type RowAction = 'pin' | 'unpin' | 'archive' | 'unarchive' | 'unread'

interface ChatListRowProps {
  conversation: any
  selected: boolean
  onSelect: () => void
  onAction: (action: RowAction) => void
}

/** One chat in the list. Long-press or right-click (or the menu button on wide screens) opens the actions. */
export function ChatListRow({ conversation: c, selected, onSelect, onAction }: ChatListRowProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const moved = React.useRef(false)
  const fired = React.useRef(false)

  const contact = c.contact || c
  const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.phoneNumber || 'Customer'
  const last = c.messages?.[0] || contact.chatMessages?.[0]
  const outbound = last?.direction === 'OUTBOUND'
  const tick = tickState(last?.status)
  const unread = c.unreadCount > 0

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const run = (a: RowAction) => () => {
    setMenuOpen(false)
    onAction(a)
  }

  return (
    <div
      className="group/row relative flex items-center border-b border-border"
      onTouchStart={() => {
        moved.current = false
        cancel()
        timer.current = setTimeout(() => {
          fired.current = true
          setMenuOpen(true)
        }, 450)
      }}
      onTouchMove={() => {
        moved.current = true
        cancel()
      }}
      onTouchEnd={cancel}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenuOpen(true)
      }}
    >
      <ListRow
        active={selected}
        onClick={() => {
          // A long-press opens the menu; the click that follows the release must not open the chat.
          if (fired.current) {
            fired.current = false
            return
          }
          onSelect()
        }}
        className="min-w-0 flex-1"
        leading={<UserAvatar name={name} size="lg" />}
        title={<span className={cn(unread && 'font-semibold')}>{name}</span>}
        subtitle={
          <span className="flex items-center gap-1">
            {outbound &&
              (tick === 'sent' ? (
                <Check className="size-4 shrink-0 text-muted-foreground" aria-label="Sent" />
              ) : (
                <CheckCheck
                  className={cn('size-4 shrink-0', tick === 'read' ? 'text-read-tick' : 'text-muted-foreground')}
                  aria-label={tick === 'read' ? 'Read' : 'Delivered'}
                />
              ))}
            <span className="truncate">{messagePreview(last)}</span>
          </span>
        }
        meta={
          <span className={cn('text-xs', unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {c.lastMessageAt ? formatTimeAgo(new Date(c.lastMessageAt)) : ''}
          </span>
        }
        trailing={
          <span className="flex items-center gap-1.5">
            {c.muted && <VolumeX className="size-4 text-muted-foreground" aria-label="Muted" />}
            {c.pinned && <Pin className="size-4 text-muted-foreground" aria-label="Pinned" />}
            {unread && <Badge variant="count">{c.unreadCount}</Badge>}
          </span>
        }
      />

      <IconButton
        label="Chat actions"
        size="sm"
        onClick={() => setMenuOpen(true)}
        className="mr-2 hidden shrink-0 md:inline-flex md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100"
      >
        <MoreVertical />
      </IconButton>

      <BottomSheet open={menuOpen} onOpenChange={setMenuOpen} title={name}>
        <div className="pb-2">
          <ListRow
            leading={c.pinned ? <PinOff className="size-5" /> : <Pin className="size-5" />}
            title={c.pinned ? 'Unpin chat' : 'Pin chat'}
            onClick={run(c.pinned ? 'unpin' : 'pin')}
          />
          <ListRow
            leading={c.archived ? <ArchiveRestore className="size-5" /> : <Archive className="size-5" />}
            title={c.archived ? 'Move back to chats' : 'Archive chat'}
            onClick={run(c.archived ? 'unarchive' : 'archive')}
          />
          {!unread && <ListRow leading={<MailOpen className="size-5" />} title="Mark as unread" onClick={run('unread')} />}
        </div>
      </BottomSheet>
    </div>
  )
}
