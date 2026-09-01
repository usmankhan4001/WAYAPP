"use client";

import * as React from "react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** destructive styling for the confirm button */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

/**
 * Promise-based confirmation. Replaces every native `confirm()` call.
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete campaign?", destructive: true })) { ... }
 */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

interface PendingState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingState | null>(null);

  const confirm = React.useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const settle = React.useCallback(
    (value: boolean) => {
      setPending((prev) => {
        prev?.resolve(value);
        return null;
      });
    },
    []
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
        size="sm"
        title={pending?.title}
        description={pending?.description}
        footer={
          <>
            <Button variant="outline" onClick={() => settle(false)}>
              {pending?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={pending?.destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {pending?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        {null}
      </Modal>
    </ConfirmContext.Provider>
  );
}
