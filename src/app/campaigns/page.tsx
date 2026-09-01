'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

import { formatDateTime } from '@/lib/utils';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { EmptyCampaigns } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/page-header';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Campaign = Record<string, any>;

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PAUSED', label: 'Paused' },
] as const;

const STATUS_TONE: Record<string, string> = {
  COMPLETED: 'success',
  RUNNING: 'info',
  PAUSED: 'warning',
};

const readRateOf = (c: Campaign) =>
  c.deliveredCount > 0 ? Math.round((c.readCount / c.deliveredCount) * 100) : 0;

export default function CampaignsPage() {
  const confirm = useConfirm();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchCampaigns = () => {
    fetch('/api/campaigns')
      .then((res) => res.json())
      .then((data) => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = campaigns.filter((c) => filter === 'ALL' || c.status === filter);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this campaign?',
      description: 'Analytics and dispatch history for this broadcast will be removed. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      fetchCampaigns();
    } catch {
      /* noop */
    }
  };

  const columns: DataTableColumn<Campaign>[] = [
    {
      id: 'name',
      header: 'Campaign & template',
      primary: true,
      cell: (c) => (
        <>
          <Link href={`/campaigns/${c.id}`} className="block font-semibold text-foreground hover:text-primary">
            {c.name}
          </Link>
          <span className="font-mono text-2xs text-muted-foreground">{c.template?.name}</span>
        </>
      ),
    },
    { id: 'status', header: 'Status', cell: (c) => <StatusBadge tone={STATUS_TONE[c.status] ?? 'neutral'}>{c.status}</StatusBadge> },
    { id: 'recipients', header: 'Recipients', className: 'text-center font-mono font-semibold text-foreground', headerClassName: 'text-center', cell: (c) => c.totalContacts },
    { id: 'sent', header: 'Sent', className: 'text-center font-mono', headerClassName: 'text-center', cell: (c) => c.sentCount },
    { id: 'delivered', header: 'Delivered', className: 'text-center font-mono font-semibold text-success', headerClassName: 'text-center', cell: (c) => c.deliveredCount },
    { id: 'read', header: 'Read rate', className: 'text-center font-mono font-semibold text-info', headerClassName: 'text-center', cell: (c) => `${readRateOf(c)}% (${c.readCount})` },
    { id: 'replies', header: 'Replies', className: 'text-center font-mono font-semibold', headerClassName: 'text-center', cell: (c) => c.repliedCount },
    { id: 'created', header: 'Created', className: 'text-2xs text-muted-foreground', cell: (c) => formatDateTime(c.createdAt) },
    {
      id: 'actions',
      header: '',
      hideOnMobile: true,
      className: 'text-right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" render={<Link href={`/campaigns/${c.id}`} />} title="View details">
            <ExternalLink />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c.id)} title="Delete campaign">
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (c: Campaign) => {
    const progressPct = c.totalContacts > 0 ? Math.round((c.sentCount / c.totalContacts) * 100) : 0;
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/campaigns/${c.id}`} className="block truncate text-sm font-semibold text-foreground hover:text-primary">
              {c.name}
            </Link>
            <span className="font-mono text-2xs text-muted-foreground">{c.template?.name}</span>
          </div>
          <StatusBadge tone={STATUS_TONE[c.status] ?? 'neutral'} className="shrink-0">
            {c.status}
          </StatusBadge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-2xs text-muted-foreground">
            <span>Progress ({progressPct}%)</span>
            <span className="font-mono">{c.sentCount} / {c.totalContacts}</span>
          </div>
          <Progress value={progressPct} className="w-full" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Delivered', value: c.deliveredCount, tone: 'text-success' },
            { label: 'Read rate', value: `${readRateOf(c)}%`, tone: 'text-info' },
            { label: 'Replies', value: c.repliedCount, tone: 'text-foreground' },
          ].map((m) => (
            <div key={m.label} className="rounded-lg bg-muted p-2">
              <span className="block text-2xs text-muted-foreground">{m.label}</span>
              <span className={`font-mono text-xs font-bold ${m.tone}`}>{m.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <span className="text-2xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c.id)}>
              <Trash2 />
            </Button>
            <Button variant="secondary" size="sm" render={<Link href={`/campaigns/${c.id}`} />}>
              Details <ExternalLink />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Broadcast campaigns"
        description="Launch, schedule and track rate-limited WhatsApp template broadcasts."
        actions={
          <Button variant="wa" render={<Link href="/campaigns/new" />}>
            <Plus />
            New Broadcast
          </Button>
        }
      />

      <FilterTabs options={FILTERS} value={filter} onValueChange={setFilter} className="border-b border-border pb-2" />

      {!loading && filtered.length === 0 ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <EmptyCampaigns />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(c) => c.id}
          loading={loading}
          renderMobileCard={renderMobileCard}
          emptyTitle="No campaigns match this filter"
        />
      )}
    </div>
  );
}
