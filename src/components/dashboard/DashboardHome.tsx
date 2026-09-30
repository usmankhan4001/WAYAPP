'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Clock,
  MessageCircle,
  MessageSquarePlus,
  RefreshCw,
  Send,
  UserPlus,
  FileText,
  ChevronRight,
  Users,
  TrendingUp,
  MessagesSquare,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { SetupWalkthrough } from '@/components/common/SetupWalkthrough';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/filter-tabs';
import { ListRow } from '@/components/ui/list-row';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatPill } from '@/components/ui/stat-pill';
import { UserAvatar } from '@/components/ui/avatar';
import type { DashboardSummary, LeadBar } from '@/lib/dashboard/summary';

// Dates arrive as strings over JSON, the shape is otherwise the server's.
type Summary = DashboardSummary & { user?: { name?: string } };
type Range = 'today' | '7d' | '30d';

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
] as const;

const QUICK_ACTIONS = [
  { href: '/inbox?new=1', label: 'New chat', icon: MessageSquarePlus },
  { href: '/campaigns/new', label: 'New broadcast', icon: Send },
  { href: '/contacts', label: 'Add contacts', icon: UserPlus },
  { href: '/templates', label: 'Send a template', icon: FileText },
];

export function DashboardHome() {
  const [range, setRange] = useState<Range>('7d');
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (r: Range) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/dashboard/summary?range=${r}`);
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const firstName = data?.user?.name?.trim().split(/\s+/)[0];
  const isNew = !!data && !data.setup.hasContacts && !data.setup.hasCampaigns;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
            {firstName ? `Hi, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted-foreground">Here is what needs you today.</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => load(range)} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} />
        </Button>
      </header>

      {isNew && <SetupWalkthrough hasContacts={data.setup.hasContacts} hasCampaigns={data.setup.hasCampaigns} />}

      <QuickActions />

      {failed && !data ? (
        <Card>
          <CardContent>
            <EmptyState
              variant="compact"
              icon={AlertCircle}
              title="We could not load your dashboard"
              description="Check your connection and try again."
              actionLabel="Try again"
              onAction={() => load(range)}
            />
          </CardContent>
        </Card>
      ) : !data ? (
        <LoadingCards />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <TodayCard data={data} range={range} onRange={setRange} loading={loading} />
            <RepliesCard data={data} range={range} />
          </div>
          <div className="space-y-5">
            <NeedsAttentionCard data={data} />
            <LeadsCard leads={data.leads} />
            <RecentChatsCard chats={data.recentChats} />
          </div>
        </div>
      )}
      {failed && data && (
        <p className="text-center text-sm text-muted-foreground">
          Could not refresh.{' '}
          <button className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => load(range)}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}

function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-raised px-4 text-sm font-medium text-foreground outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Icon className="size-4 text-primary" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <Skeleton variant="rounded" height={140} className="rounded-2xl" />
        <Skeleton variant="rounded" height={260} className="rounded-2xl" />
      </div>
      <div className="space-y-5">
        <Skeleton variant="rounded" height={200} className="rounded-2xl" />
        <Skeleton variant="rounded" height={180} className="rounded-2xl" />
      </div>
    </div>
  );
}

function TodayCard({
  data,
  range,
  onRange,
  loading,
}: {
  data: Summary;
  range: Range;
  onRange: (r: Range) => void;
  loading: boolean;
}) {
  const t = data.today;
  const empty = t.sent.value + t.replies.value + t.sent.previous + t.replies.previous === 0;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>{range === 'today' ? 'Today' : `Last ${range === '7d' ? '7' : '30'} days`}</CardTitle>
        <SegmentedControl options={RANGE_OPTIONS} value={range} onValueChange={(v) => onRange(v as Range)} />
      </CardHeader>
      <CardContent className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {empty ? (
          <EmptyState
            variant="compact"
            icon={TrendingUp}
            title="No messages yet"
            description="Your numbers appear here once you send or receive a message."
            actionLabel="Send a message"
            actionHref="/inbox?new=1"
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            <StatPill label="Sent" value={t.sent.value} change={t.sent.change} />
            <StatPill label="Delivered" value={t.delivered.value} change={t.delivered.change} />
            <StatPill label="Read" value={t.read.value} change={t.read.change} />
            <StatPill label="Replies" value={t.replies.value} change={t.replies.change} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RepliesCard({ data, range }: { data: Summary; range: Range }) {
  const points = data.repliesOverTime;
  const total = points.reduce((n, p) => n + p.current, 0);
  const prevTotal = points.reduce((n, p) => n + p.previous, 0);
  const lastIdx = points.length - 1;
  const last = points[lastIdx];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Replies over time</CardTitle>
        <p className="text-sm text-muted-foreground">
          {range === 'today' ? 'By hour, against yesterday' : 'By day, against the period before'}
        </p>
      </CardHeader>
      <CardContent>
        {total + prevTotal === 0 ? (
          <EmptyState
            variant="compact"
            icon={MessagesSquare}
            title="No replies yet"
            description="When customers answer you, the trend shows up here."
          />
        ) : (
          <div className="h-56 w-full text-muted-foreground" role="img" aria-label={`${total} replies in this period`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 16, right: 12, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    color: 'var(--foreground)',
                    fontSize: 13,
                  }}
                />
                <Line type="monotone" dataKey="previous" name="Before" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="current" name="Replies" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                {last && (
                  <ReferenceDot
                    x={last.label}
                    y={last.current}
                    r={6}
                    fill="var(--chart-highlight)"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    label={{ value: String(last.current), position: 'top', fill: 'var(--foreground)', fontSize: 12 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NeedsAttentionCard({ data }: { data: Summary }) {
  const n = data.needsAttention;
  const rows = [
    {
      key: 'unanswered',
      icon: MessageCircle,
      title: 'Waiting for a reply',
      item: n.unansweredChats,
      href: '/inbox?filter=unread',
    },
    {
      key: 'closing',
      icon: Clock,
      title: 'Closing soon',
      item: n.repliesClosingSoon,
      href: '/inbox?filter=closing',
    },
    {
      key: 'failed',
      icon: AlertCircle,
      title: 'Failed to send',
      item: n.failedMessages,
      href: '/inbox?filter=failed',
    },
  ];
  const total = rows.reduce((s, r) => s + r.item.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {total === 0 ? (
          <EmptyState variant="compact" icon={MessageCircle} title="You are all caught up" description="Nothing is waiting on you right now." />
        ) : (
          rows.map(({ key, icon: Icon, title, item, href }) => (
            <Link key={key} href={href} className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <ListRow
                leading={
                  <span className="flex size-10 items-center justify-center rounded-full bg-raised text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                }
                title={title}
                subtitle={
                  item.count === 0 ? 'None' : item.contacts.map((c) => c.name).join(', ') + (item.count > item.contacts.length ? '...' : '')
                }
                trailing={
                  <span className="flex items-center gap-1 text-base font-semibold tabular-nums text-foreground">
                    {item.count}
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </span>
                }
              />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LeadsCard({ leads }: { leads: Summary['leads'] }) {
  const [mode, setMode] = useState<'label' | 'stage'>('label');
  const bars: LeadBar[] = mode === 'label' ? leads.byLabel : leads.byStage;
  const max = Math.max(1, ...bars.map((b) => b.count));
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Leads</CardTitle>
        <SegmentedControl
          options={[
            { value: 'label', label: 'By label' },
            { value: 'stage', label: 'By stage' },
          ]}
          value={mode}
          onValueChange={(v) => setMode(v as 'label' | 'stage')}
        />
      </CardHeader>
      <CardContent>
        {bars.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={Users}
            title={mode === 'label' ? 'No labels used yet' : 'No contacts yet'}
            description="Add contacts and give them a label to see them grouped here."
            actionLabel="Open contacts"
            actionHref="/contacts"
          />
        ) : (
          <ul className="space-y-3">
            {bars.slice(0, 8).map((b) => (
              <li key={b.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate text-foreground">{b.label}</span>
                  <span className="font-medium tabular-nums text-muted-foreground">{b.count}</span>
                </div>
                <progress
                  value={b.count}
                  max={max}
                  aria-label={b.label}
                  className="h-2 w-full overflow-hidden rounded-full bg-raised accent-chart-1 [&::-moz-progress-bar]:bg-chart-1 [&::-webkit-progress-bar]:bg-raised [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-chart-1"
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

function RecentChatsCard({ chats }: { chats: Summary['recentChats'] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent chats</CardTitle>
        <Link href="/inbox" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          See all
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {chats.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={MessagesSquare}
            title="No chats yet"
            description="Start a conversation with a customer."
            actionLabel="New chat"
            actionHref="/inbox?new=1"
          />
        ) : (
          chats.map((c) => (
            <Link key={c.id} href={`/inbox?conversation=${c.id}`} className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <ListRow
                leading={<UserAvatar name={c.contact.name} />}
                title={c.contact.name}
                subtitle={<span className="line-clamp-1">{c.preview}</span>}
                meta={<span className="text-xs text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>}
                trailing={
                  c.unreadCount > 0 ? (
                    <Chip selected tabIndex={-1} className="h-6 px-2 text-xs">
                      {c.unreadCount}
                    </Chip>
                  ) : undefined
                }
              />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
