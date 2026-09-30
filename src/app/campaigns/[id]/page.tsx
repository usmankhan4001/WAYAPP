'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

import { LiveProgressCard } from '@/components/campaigns/LiveProgressCard';
import { MessageLogTable } from '@/components/analytics/MessageLogTable';
import { WhatsAppMockupPreview } from '@/components/templates/WhatsAppMockupPreview';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = () => {
    fetch(`/api/campaigns/${id}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaign();
    const interval = setInterval(fetchCampaign, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (action: 'START' | 'PAUSE' | 'RESUME' | 'CANCEL') => {
    setActionError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.error || 'That action could not be completed.');
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
      <div className="rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
        <p className="text-sm font-semibold text-foreground">Campaign not found</p>
        <Link href="/campaigns" className="mt-2 inline-block text-xs font-semibold text-primary">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const { campaign, stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" render={<Link href="/campaigns" />} aria-label="Back to campaigns">
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{campaign.name}</h1>
            <p className="text-xs text-muted-foreground">
              Template: <span className="font-mono text-foreground">{campaign.template?.name}</span>
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCampaign}>
          <RefreshCw />
          Refresh
        </Button>
      </div>

      {campaign.status === 'DRAFT' && (
        <div role="status" className="rounded-xl border border-border bg-muted p-3 text-xs text-foreground">
          This broadcast is saved as a draft and has <strong>not been sent</strong>.
        </div>
      )}
      {actionError && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-3 text-xs text-destructive">
          {actionError}
        </div>
      )}
      <LiveProgressCard campaign={campaign} stats={stats} onAction={handleAction} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <MessageLogTable messages={campaign.messages || []} />
        </div>
        <div className="flex flex-col items-center rounded-xl bg-card p-5 ring-1 ring-foreground/10 lg:col-span-4">
          <h3 className="mb-4 self-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Broadcast template
          </h3>
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
