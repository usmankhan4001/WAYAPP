"use client";

/**
 * Compatibility shim: the app's original `useToast()` / `<ToastProvider>` API,
 * now backed by `sonner`. Call sites keep working unchanged; new code can also
 * import `toast` from `sonner` directly.
 */

import * as React from "react";
import { toast as sonnerToast } from "sonner";

import { Toaster } from "@/components/ui/sonner";

type ToastType = "success" | "error" | "warning" | "info";

/** Optional button on the toast, for example Undo or View. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string, duration?: number, action?: ToastAction) => void;
  success: (title: string, message?: string, action?: ToastAction) => void;
  error: (title: string, message?: string, action?: ToastAction) => void;
  warning: (title: string, message?: string, action?: ToastAction) => void;
  info: (title: string, message?: string, action?: ToastAction) => void;
}

function emit(type: ToastType, title: string, message?: string, duration?: number, action?: ToastAction) {
  const opts = { description: message, duration, action };
  if (type === "success") sonnerToast.success(title, opts);
  else if (type === "error") sonnerToast.error(title, opts);
  else if (type === "warning") sonnerToast.warning(title, opts);
  else sonnerToast.info(title, opts);
}

const value: ToastContextValue = {
  toast: emit,
  success: (title, message, action) => emit("success", title, message, undefined, action),
  error: (title, message, action) => emit("error", title, message, undefined, action),
  warning: (title, message, action) => emit("warning", title, message, undefined, action),
  info: (title, message, action) => emit("info", title, message, undefined, action),
};

export function useToast(): ToastContextValue {
  return value;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

export { sonnerToast as toast };
