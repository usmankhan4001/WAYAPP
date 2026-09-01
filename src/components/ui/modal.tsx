"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type ModalSize = "sm" | "md" | "lg" | "xl";

const DESKTOP_SIZE: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** desktop dialog max-width; ignored on mobile (always full-width bottom sheet) */
  size?: ModalSize;
  /** hide the title/description header row */
  hideHeader?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * The one modal primitive. Renders a centered shadcn Dialog on >=768px and a
 * bottom Drawer (swipe-to-dismiss) on mobile — the core of the "distinct mobile
 * layouts" decision. Replaces every hand-rolled `fixed inset-0` modal.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  hideHeader = false,
  className,
  contentClassName,
}: ModalProps) {
  const isMobile = useIsMobile();
  const showHeader = !hideHeader && (title || description);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={className}>
          {showHeader && (
            <DrawerHeader>
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </DrawerHeader>
          )}
          {children != null && (
            <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-4", !showHeader && "pt-4", contentClassName)}>
              {children}
            </div>
          )}
          {footer && <DrawerFooter>{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(DESKTOP_SIZE[size], className)}>
        {showHeader && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children != null && (
          <div className={cn("max-h-[70vh] overflow-y-auto", contentClassName)}>{children}</div>
        )}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
