'use client';

import React from 'react';
import { Play, Pause, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface LiveProgressCardProps {
  campaign: AnyRecord;
  stats: AnyRecord;
  onAction: (action: 'START' | 'PAUSE' | 'RESUME' | 'CANCEL') => void;
}

const STATUS_TONE: Record<string, string> = {
  COMPLETED: 'success',
  RUNNING: 'info',
  QUEUED: 'info',
  PAUSED: 'warning',
};

export function LiveProgressCard({ campaign, stats, onAction }: LiveProgressCardProps) {
  const isRunning = campaign.status === 'RUNNING' || campaign.status === 'QUEUED';
  const isPaused = campaign.status === 'PAUSED';
  const isCompleted = campaign.status === 'COMPLETED';

  const progressPct =
    campaign.totalContacts > 0
      ? Math.min(100, Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalContacts) * 100))
      : 0;

  const metrics = [
    { label: 'Sent', value: campaign.sentCount, tone: 'text-foreground' },
    { label: `Delivered (${stats.deliveryRate}%)`, value: campaign.deliveredCount, tone: 'text-success' },
    { label: `Read (${stats.readRate}%)`, value: campaign.readCount, tone: 'text-info' },
    { label: `Replies (${stats.replyRate}%)`, value: campaign.repliedCount, tone: 'text-accent-foreground' },
    { label: `Failed (${stats.failureRate}%)`, value: campaign.failedCount, tone: 'text-destructive' },
  ];

  return (
    <div className="space-y-5 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={STATUS_TONE[campaign.status] ?? 'neutral'}>{campaign.status}</StatusBadge>
            <span className="text-2xs text-muted-foreground">
              Created {new Date(campaign.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{campaign.name}</h2>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <Button variant="outline" size="sm" onClick={() => onAction('PAUSE')}>
              <Pause />
              Pause
            </Button>
          )}
          {isPaused && (
            <Button size="sm" onClick={() => onAction('RESUME')}>
              <Play />
              Resume
            </Button>
          )}
          {!isCompleted && campaign.status !== 'CANCELLED' && (
            <Button variant="outline" size="sm" onClick={() => onAction('CANCEL')} className="text-destructive">
              <XCircle />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Dispatched {campaign.sentCount + campaign.failedCount} of {campaign.totalContacts} contacts
          </span>
          <span className="font-mono font-semibold text-foreground">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-muted p-3 text-center">
            <span className="mb-0.5 block text-2xs font-medium text-muted-foreground">{m.label}</span>
            <p className={`font-mono text-base font-semibold ${m.tone}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
