"use client"

import { Modal, type ModalProps } from "@/components/ui/modal"

export type BottomSheetProps = ModalProps

/**
 * Bottom sheet on phones (under 768px), centred dialog on desktop, one API.
 * This is the shared Modal; use whichever name reads better at the call site.
 */
export function BottomSheet(props: BottomSheetProps) {
  return <Modal {...props} />
}
