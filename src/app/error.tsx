'use client';

import { useEffect } from 'react';

import { ErrorState } from '@/components/ui/error-state';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[WAYAPP Error Boundary]', error);
  }, [error]);

  return <ErrorState error={error} onRetry={reset} />;
}
