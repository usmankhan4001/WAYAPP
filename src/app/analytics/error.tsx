'use client';

import { useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

import { ErrorState } from '@/components/ui/error-state';

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Analytics Error]', error);
  }, [error]);

  return (
    <ErrorState
      icon={BarChart3}
      title="Analytics unavailable"
      description="We couldn't load the analytics dashboard. This may be a temporary database issue."
      retryLabel="Reload analytics"
      onRetry={reset}
    />
  );
}
