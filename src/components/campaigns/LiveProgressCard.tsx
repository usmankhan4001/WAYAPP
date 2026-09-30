'use client';

import React from 'react';
import { Play, Pause, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatPill } from '@/components/ui/stat-pill';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { StatusPill, DeliveryBar } from './CampaignBits';
import { campaignStatusPill, progressPercents } from '@/lib/campaigns/present';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

type Action = 'START' | 'PAUSE' | 'RESUME' | 'CANCEL';

interface LiveProgressCardProps {
  campaign: AnyRecord;
  stats: AnyRecord;
  onAction: (action: Action) => void;
}

export function LiveProgressCard({ campaign, stats, onAction }: LiveProgressCardProps) {
  const confirm = useConfirm();
  const isRunning = campaign.status === 'RUNNING' || campaign.status === 'QUEUED';
  const isPaused = campaign.status === 'PAUSED';
  const isFinished = ['COMPLETED', 'CANCELLED', 'FAILED'].includes(campaign.status);
  const p = progressPercents(campaign);

  const ask = async (action: Action, title: string, description: string, confirmLabel: string, destructive = false) => {
    if (await confirm({ title, description, confirmLabel, cancelLabel: 'Not now', destructive })) onAction(action);
  };

  const metrics = [
    { label: 'Sent', value: campaign.sentCount, note: `${p.sent}% of everyone` },
    { label: 'Delivered', value: campaign.deliveredCount, note: `${stats?.deliveryRate ?? 0}% of sent` },
    { label: 'Read', value: campaign.readCount, note: `${stats?.readRate ?? 0}% of delivered` },
    { label: 'Replied', value: campaign.repliedCount, note: `${stats?.replyRate ?? 0}% of delivered` },
    { label: 'Failed', value: campaign.failedCount, note: `${stats?.failureRate ?? 0}% of everyone` },
  ];

  return (
    <div className="space-y-5 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusPill pill={campaignStatusPill(campaign.status)} />
            <span className="text-sm text-muted-foreground">Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
          </div>
          <h2 className="mt-1 truncate text-lg font-semibold text-foreground">{campaign.name}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRunning && (
            <Button
              variant="outline"
              onClick={() =>
                ask('PAUSE', 'Pause this broadcast?', 'Messages stop going out now. People who have not received it yet will wait until you resume.', 'Pause broadcast')
              }
            >
              <Pause />
              Pause
            </Button>
          )}
          {isPaused && (
            <Button
              onClick={() =>
                ask('RESUME', 'Resume this broadcast?', 'Messages will start going out again to the people still waiting.', 'Resume broadcast')
              }
            >
              <Play />
              Resume
            </Button>
          )}
          {!isFinished && (
            <Button
              variant="destructive"
              onClick={() =>
                ask('CANCEL', 'Cancel this broadcast?', 'It will stop for good. Anyone who has not received it yet will not get it, and you cannot undo this.', 'Cancel broadcast', true)
              }
            >
              <XCircle />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {campaign.sentCount + campaign.failedCount} of {campaign.totalContacts} people handled
          </span>
          <span className="font-semibold text-foreground tabular-nums">{p.done}%</span>
        </div>
        <DeliveryBar campaign={campaign} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-0.5">
            <StatPill label={m.label} value={m.value ?? 0} invert={m.label === 'Failed'} />
            <p className="text-xs text-muted-foreground">{m.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
