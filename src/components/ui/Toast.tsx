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

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

function emit(type: ToastType, title: string, message?: string, duration?: number) {
  const opts = { description: message, duration };
  if (type === "success") sonnerToast.success(title, opts);
  else if (type === "error") sonnerToast.error(title, opts);
  else if (type === "warning") sonnerToast.warning(title, opts);
  else sonnerToast.info(title, opts);
}

const value: ToastContextValue = {
  toast: emit,
  success: (title, message) => emit("success", title, message),
  error: (title, message) => emit("error", title, message),
  warning: (title, message) => emit("warning", title, message),
  info: (title, message) => emit("info", title, message),
};

export function useToast(): ToastContextValue {
  return value;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  );
}

export { sonnerToast as toast };
