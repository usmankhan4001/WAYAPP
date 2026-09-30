'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { LiveProgressCard } from '@/components/campaigns/LiveProgressCard';
import { RecipientList } from '@/components/campaigns/RecipientList';
import { useDispatchEnabled } from '@/components/campaigns/CampaignBits';
import { WhatsAppMockupPreview } from '@/components/templates/WhatsAppMockupPreview';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const dispatchOn = useDispatchEnabled();
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCampaign = useCallback(() => {
    fetch(`/api/campaigns/${id}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchCampaign();
    const interval = setInterval(fetchCampaign, 3000);
    return () => clearInterval(interval);
  }, [fetchCampaign]);

  const handleAction = async (action: 'START' | 'PAUSE' | 'RESUME' | 'CANCEL') => {
    setActionError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setActionError(body?.error || 'That could not be done. Please try again.');
      }
      fetchCampaign();
    } catch {
      setActionError('Could not reach the server. Check your connection and try again.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </div>
    );
  }

  if (!data?.campaign) {
    return (
      <div className="space-y-4">
        <Alert
          tone={loadFailed ? 'danger' : 'info'}
          title={loadFailed ? 'This broadcast did not load' : 'Broadcast not found'}
          action={
            loadFailed ? (
              <Button variant="outline" onClick={fetchCampaign}>
                Try again
              </Button>
            ) : (
              <Button variant="outline" render={<Link href="/campaigns" />}>
                Back to broadcasts
              </Button>
            )
          }
        >
          {loadFailed ? 'Check your connection and try again.' : 'It may have been deleted.'}
        </Alert>
      </div>
    );
  }

  const { campaign, stats } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" render={<Link href="/campaigns" />} aria-label="Back to broadcasts">
          <ArrowLeft />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">Broadcast results</h1>
          <p className="text-sm text-muted-foreground">Updates by itself every few seconds.</p>
        </div>
      </div>

      {campaign.status === 'DRAFT' && (
        <Alert tone="info" title="Saved as a draft">
          This broadcast has <strong>not been sent</strong>.
          {dispatchOn === false ? ' Sending is switched off right now.' : ''}
        </Alert>
      )}
      {loadFailed && (
        <Alert tone="warning" title="Could not refresh">
          Showing the last numbers we loaded. We will keep trying.
        </Alert>
      )}
      {actionError && (
        <Alert tone="danger" title="That did not work" onDismiss={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <LiveProgressCard campaign={campaign} stats={stats} onAction={handleAction} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RecipientList messages={campaign.messages || []} />
        </div>
        <div className="flex flex-col items-center rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5 lg:col-span-4">
          <h3 className="mb-4 self-start text-base font-semibold text-foreground">The message</h3>
          <WhatsAppMockupPreview
            templateName={campaign.template?.name}
            category={campaign.template?.category}
            components={campaign.template?.components}
            headerMediaUrl={campaign.headerMediaUrl}
            sampleVariables={{ '1': 'Customer', '2': 'Company', '3': 'PROMO' }}
          />
        </div>
      </div>
    </div>
  );
}
