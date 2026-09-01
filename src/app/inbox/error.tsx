'use client';

import { useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

import { ErrorState } from '@/components/ui/error-state';

export default function InboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Inbox Error]', error);
  }, [error]);

  return (
    <ErrorState
      icon={MessageSquare}
      title="Inbox error"
      description="We couldn't load the team inbox. Your messages are safe — please try again."
      retryLabel="Reload inbox"
      onRetry={reset}
    />
  );
}
