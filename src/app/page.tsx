'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  Users,
  FileText,
  CheckCheck,
  Eye,
  MessageSquare,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';

import { ConversionFunnelChart } from '@/components/analytics/ConversionFunnelChart';
import { VolumeTrendsChart } from '@/components/analytics/VolumeTrendsChart';
import { SetupWalkthrough } from '@/components/common/SetupWalkthrough';
import { formatDateTime } from '@/lib/utils';
import { useSettings } from '@/components/providers/SessionProvider';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Stat, StatGrid } from '@/components/ui/stat';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const CAMPAIGN_TONE: Record<string, string> = {
  COMPLETED: 'success',
  RUNNING: 'info',
};

export default function DashboardPage() {
  const { settings } = useSettings();
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((analyticsData) => setData(analyticsData))
      .catch(() => setError('Unable to load dashboard data. Please check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard unavailable</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const summary: AnyRecord = data?.summary || {};
  const hasCredentials = Boolean(settings?.phoneNumberId && settings?.accessTokenMasked);
  const hasTemplates = (summary.totalTemplates || 0) > 0;
  const hasContacts = (summary.totalContacts || 0) > 0;
  const hasCampaigns = (summary.totalCampaigns || 0) > 0;

  const num = (v: unknown): string => (typeof v === 'number' ? v.toLocaleString() : String(v ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Delivery, read and reply performance across your WhatsApp broadcasts."
        actions={
          <Button variant="wa" render={<Link href="/campaigns/new" />}>
            <Send />
            New Broadcast
          </Button>
        }
      />

      <SetupWalkthrough
        hasCredentials={hasCredentials}
        hasTemplates={hasTemplates}
        hasContacts={hasContacts}
        hasCampaigns={hasCampaigns}
      />

      <StatGrid className="lg:grid-cols-5">
        <Stat
          label="Targeted"
          value={num(summary.totalMessages)}
          hint={`${summary.totalCampaigns || 0} campaigns`}
          icon={<Send />}
        />
        <Stat
          label="Delivery rate"
          value={`${summary.deliveryRate ?? 0}%`}
          hint={`${num(summary.totalDelivered)} delivered`}
          icon={<CheckCheck />}
        />
        <Stat
          label="Read rate"
          value={`${summary.readRate ?? 0}%`}
          hint={`${num(summary.totalRead)} read`}
          icon={<Eye />}
        />
        <Stat
          label="Reply rate"
          value={`${summary.replyRate ?? 0}%`}
          hint={`${num(summary.totalReplied)} replies`}
          icon={<MessageSquare />}
        />
        <Stat
          label="Failed / bounces"
          value={`${summary.failureRate ?? 0}%`}
          hint={`${num(summary.totalFailed)} errors`}
          icon={<AlertCircle />}
          deltaTone="down"
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <ConversionFunnelChart funnel={data?.funnel || []} />
        </div>
        <div className="lg:col-span-6">
          <VolumeTrendsChart data={data?.dailyVolume || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Recent campaigns */}
        <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:col-span-8">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Recent broadcast campaigns
            </h3>
            <Link
              href="/campaigns"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {!data?.recentCampaigns || data.recentCampaigns.length === 0 ? (
            <EmptyState
              icon={Send}
              variant="compact"
              title="No campaigns launched yet"
              description="Choose an approved template and launch your first broadcast."
              actionLabel="Create first campaign"
              actionHref="/campaigns/new"
            />
          ) : (
            <div className="divide-y divide-border">
              {data.recentCampaigns.map((c: AnyRecord) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-xs font-medium text-foreground hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    <p className="text-2xs text-muted-foreground">
                      Template: <span className="font-mono text-foreground">{c.template?.name}</span> ·{' '}
                      {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="font-semibold text-foreground">{c.totalContacts}</span>
                      <span className="block text-2xs text-muted-foreground">contacts</span>
                    </div>
                    <StatusBadge tone={CAMPAIGN_TONE[c.status] ?? 'neutral'}>{c.status}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shortcuts */}
        <div className="space-y-2.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:col-span-4">
          <h3 className="border-b border-border pb-1 text-xs font-semibold uppercase tracking-wider text-foreground">
            Quick shortcuts
          </h3>
          <div className="space-y-2 pt-1">
            {[
              { href: '/contacts', icon: Users, title: 'Contacts & groups', sub: `${summary.totalContacts || 0} contacts · ${summary.totalGroups || 0} groups` },
              { href: '/templates', icon: FileText, title: 'Meta templates', sub: `${summary.totalTemplates || 0} approved templates` },
              { href: '/inbox', icon: MessageSquare, title: 'Live 2-way inbox', sub: 'Customer response threads' },
            ].map(({ href, icon: Icon, title, sub }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between rounded-lg border border-border p-2.5 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-medium text-foreground">{title}</h4>
                    <p className="text-2xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
