'use client'

import React from 'react'
import { Copy, Forward, Pencil, Reply, Star, StarOff } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { ListRow } from '@/components/ui/list-row'
import { cn } from '@/lib/utils'
import { messagePreview } from './chat-utils'

export const QUICK_EMOJIS = ['\u{1F44D}', '❤️', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}']

interface MessageMenuProps {
  message: any | null
  onClose: () => void
  onReply: (m: any) => void
  onReact: (m: any, emoji: string) => void
  onStar: (m: any) => void
  onCopy: (m: any) => void
  onForward: (m: any) => void
  onEdit?: (m: any) => void
  /** our own current reaction on this message, to highlight it */
  myReaction?: string
}

/** Bottom sheet opened by long-press or the bubble's menu button. */
export function MessageMenu({ message, onClose, onReply, onReact, onStar, onCopy, onForward, onEdit, myReaction }: MessageMenuProps) {
  const act = (fn: (m: any) => void) => () => {
    if (!message) return
    fn(message)
    onClose()
  }
  const isNote = message?.direction === 'INTERNAL'
  return (
    <BottomSheet
      open={!!message}
      onOpenChange={(o) => !o && onClose()}
      title="Message"
      description={message ? messagePreview(message) : undefined}
    >
      {message && (
        <div className="pb-2">
          {!isNote && (
            <div className="flex items-center justify-between gap-1 px-4 py-2" role="group" aria-label="React">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    // Tapping your current reaction again removes it.
                    onReact(message, myReaction === e ? '' : e)
                    onClose()
                  }}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-full text-2xl transition-colors',
                    myReaction === e ? 'bg-primary/20' : 'hover:bg-accent'
                  )}
                  aria-label={`React ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          {!isNote && <ListRow leading={<Reply className="size-5" />} title="Reply" onClick={act(onReply)} />}
          <ListRow
            leading={message.starred ? <StarOff className="size-5" /> : <Star className="size-5" />}
            title={message.starred ? 'Remove star' : 'Star'}
            onClick={act(onStar)}
          />
          {message.body && <ListRow leading={<Copy className="size-5" />} title="Copy" onClick={act(onCopy)} />}
          {!isNote && <ListRow leading={<Forward className="size-5" />} title="Forward" onClick={act(onForward)} />}
          {onEdit && message.body && message.direction === 'OUTBOUND' && (
            <ListRow leading={<Pencil className="size-5" />} title="Edit saved text" onClick={act(onEdit)} />
          )}
        </div>
      )}
    </BottomSheet>
  )
}

export interface GestureState {
  start: { x: number; y: number } | null
  timer: ReturnType<typeof setTimeout> | null
}

export const newGestureState = (): GestureState => ({ start: null, timer: null })

/**
 * Touch gestures for a bubble: long-press opens the menu, a short swipe to the right replies.
 * Not a hook, so one shared state (held in a ref by the caller) serves every bubble in a list.
 * Mouse users get the same menu from right-click or the bubble's menu button.
 */
export function bubbleGestures(state: GestureState, onLongPress: () => void, onSwipeReply: () => void) {
  const clear = () => {
    if (state.timer) clearTimeout(state.timer)
    state.timer = null
  }
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      state.start = { x: t.clientX, y: t.clientY }
      clear()
      state.timer = setTimeout(() => {
        state.start = null
        onLongPress()
      }, 450)
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (!state.start) return
      const t = e.touches[0]
      if (Math.abs(t.clientX - state.start.x) > 10 || Math.abs(t.clientY - state.start.y) > 10) clear()
    },
    onTouchEnd: (e: React.TouchEvent) => {
      clear()
      if (!state.start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - state.start.x
      const dy = Math.abs(t.clientY - state.start.y)
      state.start = null
      if (dx > 64 && dy < 32) onSwipeReply()
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      onLongPress()
    },
  }
}
