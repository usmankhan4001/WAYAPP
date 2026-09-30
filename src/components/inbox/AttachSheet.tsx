'use client'

import React from 'react'
import { FileText, Image as ImageIcon, MessageSquareText, StickyNote, File as FileIcon } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { ListRow } from '@/components/ui/list-row'

interface AttachSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPhoto: () => void
  onDocument: () => void
  onTemplate: () => void
  onSavedReply: () => void
  onNote: () => void
}

/** The attach button's sheet: Photo, Document, Template, Saved reply, plus the team-only note. */
export function AttachSheet({ open, onOpenChange, onPhoto, onDocument, onTemplate, onSavedReply, onNote }: AttachSheetProps) {
  const pick = (fn: () => void) => () => {
    onOpenChange(false)
    fn()
  }
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Add to message">
      <div className="pb-2">
        <ListRow leading={<ImageIcon className="size-5" />} title="Photo" subtitle="Choose a photo or video" onClick={pick(onPhoto)} />
        <ListRow leading={<FileIcon className="size-5" />} title="Document" subtitle="PDF or other file" onClick={pick(onDocument)} />
        <ListRow leading={<FileText className="size-5" />} title="Template" subtitle="Needed when the customer has not written in 24 hours" onClick={pick(onTemplate)} />
        <ListRow leading={<MessageSquareText className="size-5" />} title="Saved reply" subtitle="Insert a quick answer" onClick={pick(onSavedReply)} />
        <ListRow leading={<StickyNote className="size-5" />} title="Note to team" subtitle="Only your team sees this" onClick={pick(onNote)} />
      </div>
    </BottomSheet>
  )
}
