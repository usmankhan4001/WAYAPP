"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export { ConfirmProvider, useConfirm } from "@/lib/hooks/use-confirm";
export type { ConfirmOptions } from "@/lib/hooks/use-confirm";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Controlled confirmation dialog for call sites that manage their own open
 * state. For the imperative `await confirm({...})` form use `useConfirm()`.
 * Wording rule: the title states the action ("Delete this template?"), the description states the
 * consequence, and confirmLabel repeats the verb ("Delete template"). destructive gives the danger tone.
 * It renders inside Modal, so it is a bottom sheet on phones.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    try {
      setBusy(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={
        destructive ? (
          <span className="inline-flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
              <TriangleAlert className="size-4" aria-hidden />
            </span>
            {title}
          </span>
        ) : (
          title
        )
      }
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </Modal>
  );
}
