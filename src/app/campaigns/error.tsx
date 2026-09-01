'use client';

import { useEffect } from 'react';
import { Send } from 'lucide-react';

import { ErrorState } from '@/components/ui/error-state';

export default function CampaignsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Campaigns Error]', error);
  }, [error]);

  return (
    <ErrorState
      icon={Send}
      title="Campaign dashboard error"
      description="We couldn't load the campaigns page. Your campaign data is preserved."
      retryLabel="Reload campaigns"
      onRetry={reset}
    />
  );
}
