'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Send } from 'lucide-react';

import { formatDateTime } from '@/lib/utils';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/page-header';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill, DeliveryBar, useDispatchEnabled } from '@/components/campaigns/CampaignBits';
import { campaignStatusPill, countByFilter, matchesFilter, STATUS_FILTERS } from '@/lib/campaigns/present';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Campaign = Record<string, any>;

export default function CampaignsPage() {
  const confirm = useConfirm();
  const dispatchOn = useDispatchEnabled();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchCampaigns = useCallback(() => {
    fetch('/api/campaigns')
      .then((res) => {
        if (!res.ok) throw new Error('bad response');
        return res.json();
      })
      .then((data) => {
        setCampaigns(Array.isArray(data) ? data : []);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(interval);
  }, [fetchCampaigns]);

  const counts = countByFilter(campaigns as { status: string }[]);
  const filtered = campaigns.filter((c) => matchesFilter(c.status, filter));

  const handleDelete = async (c: Campaign) => {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      description: 'Its results and history will be removed. This cannot be undone.',
      confirmLabel: 'Delete broadcast',
      destructive: true,
    });
    if (!ok) return;
    try {
      await fetch(`/api/campaigns/${c.id}`, { method: 'DELETE' });
      fetchCampaigns();
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Broadcasts"
        description="Send one approved message to many people and see how it went."
        actions={
          <Button variant="wa" render={<Link href="/campaigns/new" />}>
            <Plus />
            New broadcast
          </Button>
        }
      />

      {dispatchOn === false && (
        <Alert tone="warning" title="Sending is switched off">
          You can create and save broadcasts, but nothing will be sent until sending is turned back on.
        </Alert>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <Chip key={f.value} selected={filter === f.value} count={counts[f.value]} onClick={() => setFilter(f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <Skeleton width={180} height={16} />
              <Skeleton width="100%" height={6} />
            </div>
          ))}
        </div>
      ) : failed && campaigns.length === 0 ? (
        <Alert
          tone="danger"
          title="Your broadcasts did not load"
          action={
            <Button variant="outline" onClick={fetchCampaigns}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Alert>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl bg-card ring-1 ring-foreground/10">
          <EmptyState
            icon={Send}
            title="No broadcasts yet"
            description="Send one message to many people at once."
            actionLabel="New broadcast"
            actionHref="/campaigns/new"
          />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
          No broadcasts with this status.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {failed && (
            <li className="p-3">
              <Alert tone="warning" title="Could not refresh" action={<Button variant="outline" onClick={fetchCampaigns}>Try again</Button>}>
                Showing the last list we loaded.
              </Alert>
            </li>
          )}
          {filtered.map((c) => (
            <li key={c.id} className="flex items-center gap-2 pr-2">
              <Link
                href={`/campaigns/${c.id}`}
                className="grid min-w-0 flex-1 gap-2 p-4 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 md:grid-cols-[minmax(0,2fr)_auto_minmax(0,1.5fr)_auto] md:items-center md:gap-6"
              >
                <div className="flex items-start justify-between gap-2 md:block">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">{c.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {c.totalContacts ?? 0} {c.totalContacts === 1 ? 'person' : 'people'} · {formatDateTime(c.scheduledAt || c.createdAt)}
                    </p>
                  </div>
                  <StatusPill pill={campaignStatusPill(c.status)} className="shrink-0 md:hidden" />
                </div>
                <StatusPill pill={campaignStatusPill(c.status)} className="hidden md:inline-flex" />
                <div className="space-y-1">
                  <DeliveryBar campaign={c} />
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {c.sentCount ?? 0} sent · {c.deliveredCount ?? 0} delivered · {c.readCount ?? 0} read · {c.repliedCount ?? 0} replied
                  </p>
                </div>
                <span className="hidden text-sm text-muted-foreground md:block">{formatDateTime(c.createdAt)}</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(c)} aria-label={`Delete ${c.name}`}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
