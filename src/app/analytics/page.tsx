'use client';

import React, { useState, useEffect } from 'react';
import { CheckCheck, Eye, MessageSquare, AlertCircle, RefreshCw, Layers } from 'lucide-react';

import { ConversionFunnelChart } from '@/components/analytics/ConversionFunnelChart';
import { VolumeTrendsChart } from '@/components/analytics/VolumeTrendsChart';
import { MessageLogTable } from '@/components/analytics/MessageLogTable';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/filter-tabs';
import { Stat, StatGrid } from '@/components/ui/stat';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

type Range = '7d' | '30d' | '90d' | 'all';

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '3 months' },
  { value: 'all', label: 'All time' },
] as const;

const CATEGORIES = [
  { key: 'MARKETING', label: 'Marketing', sub: 'Promotions & broadcasts', cls: 'bg-info-subtle text-info-subtle-foreground' },
  { key: 'UTILITY', label: 'Utility', sub: 'Order & account updates', cls: 'bg-success-subtle text-success-subtle-foreground' },
  { key: 'SERVICE', label: 'Service (2-way)', sub: 'Inbound live inquiries', cls: 'bg-accent text-accent-foreground' },
  { key: 'AUTHENTICATION', label: 'Auth / OTP', sub: 'Verification codes', cls: 'bg-warning-subtle text-warning-subtle-foreground' },
] as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('7d');
  const [recentLogs, setRecentLogs] = useState<AnyRecord[]>([]);

  const fetchAnalytics = (selectedRange: Range = range) => {
    setLoading(true);
    fetch(`/api/analytics?range=${selectedRange}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        if (json?.recentCampaigns?.[0]?.id) {
          fetch(`/api/campaigns/${json.recentCampaigns[0].id}`)
            .then((r) => r.json())
            .then((cData) => setRecentLogs(cData.campaign?.messages || []))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const summary: AnyRecord = data?.summary || {};
  const categoryCounts: AnyRecord = data?.categoryCounts || {};
  const num = (v: unknown): string => (typeof v === 'number' ? v.toLocaleString() : String(v ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Delivery &amp; engagement analytics
            <InfoTooltip content="Historical message analytics aggregated from WhatsApp Cloud API delivery receipts and 2-way inbox replies." />
          </span>
        }
        description="Delivery, read rates (blue ticks), customer replies and Meta category metrics."
        actions={
          <>
            <SegmentedControl
              options={RANGES}
              value={range}
              onValueChange={(v) => setRange(v as Range)}
            />
            <Tooltip content="Refetch latest analytics and delivery receipts.">
              <Button variant="outline" size="sm" onClick={() => fetchAnalytics(range)} disabled={loading}>
                <RefreshCw className={loading ? 'animate-spin text-primary' : ''} />
                Refresh
              </Button>
            </Tooltip>
          </>
        }
      />

      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonChart />
        </div>
      ) : (
        <>
          <StatGrid>
            <Stat
              label={<span className="inline-flex items-center gap-1">Delivery rate <InfoTooltip content="Sent messages received on customer handsets (double grey ticks)." /></span>}
              value={`${summary.deliveryRate ?? 0}%`}
              hint={`${num(summary.totalDelivered)} reached devices`}
              icon={<CheckCheck />}
            />
            <Stat
              label={<span className="inline-flex items-center gap-1">Read rate <InfoTooltip content="Delivered messages recipients opened (double blue ticks)." /></span>}
              value={`${summary.readRate ?? 0}%`}
              hint={`${num(summary.totalRead)} opened & viewed`}
              icon={<Eye />}
            />
            <Stat
              label={<span className="inline-flex items-center gap-1">Reply rate <InfoTooltip content="Customer response rate within the 24h service window." /></span>}
              value={`${summary.replyRate ?? 0}%`}
              hint={`${num(summary.totalReplied)} inbound conversations`}
              icon={<MessageSquare />}
            />
            <Stat
              label={<span className="inline-flex items-center gap-1">Meta error rate <InfoTooltip content="Messages rejected by Meta (invalid number, template mismatch, rate limits)." /></span>}
              value={`${summary.failureRate ?? 0}%`}
              hint={`${num(summary.totalFailed)} rejected`}
              icon={<AlertCircle />}
              deltaTone="down"
            />
          </StatGrid>

          {/* Category breakdown */}
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Layers className="size-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Meta conversation categories ({range.toUpperCase()})
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 md:grid-cols-4">
              {CATEGORIES.map((c) => (
                <div key={c.key} className={`rounded-lg p-3 ${c.cls}`}>
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wider">{c.label}</span>
                  <p className="mt-0.5 font-mono text-lg font-bold">{categoryCounts[c.key] || 0}</p>
                  <span className="text-[0.625rem] opacity-80">{c.sub}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <ConversionFunnelChart funnel={data?.funnel || []} />
            </div>
            <div className="lg:col-span-6">
              <VolumeTrendsChart data={data?.dailyVolume || []} />
            </div>
          </div>

          {data?.errorBreakdown && data.errorBreakdown.length > 0 && (
            <div className="space-y-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <div className="flex items-center gap-1.5 border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">Meta WhatsApp failure diagnoser</h3>
                <InfoTooltip content="Breakdown of error codes returned by Meta Graph API and webhooks." />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {data.errorBreakdown.map((err: AnyRecord) => (
                  <div key={err.code} className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold">Code {err.code}</span>
                      <span className="text-xs font-bold">{err.count} errors</span>
                    </div>
                    <p className="line-clamp-2 text-[0.6875rem] opacity-80">{err.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <MessageLogTable messages={recentLogs} />
        </>
      )}
    </div>
  );
}
