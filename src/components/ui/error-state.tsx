'use client';

import * as React from 'react';
import { AlertCircle, RefreshCw, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  /** show the raw error message in a <pre> */
  error?: Error & { digest?: string };
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * Shared error boundary body — used by every route-level error.tsx.
 */
export function ErrorState({
  icon: Icon = AlertCircle,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. This has been logged for investigation.',
  error,
  retryLabel = 'Try again',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Icon className="size-7" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {error?.message && (
          <pre className="max-h-32 overflow-x-auto rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-left text-xs text-destructive">
            {error.message}
          </pre>
        )}
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
