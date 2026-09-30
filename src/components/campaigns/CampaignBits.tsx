'use client';

import React, { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { progressPercents, type StatusPill as Pill } from '@/lib/campaigns/present';

const TONE_TO_VARIANT = {
  neutral: 'secondary',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
} as const;

/** The coloured status word used on the list, the detail header and per-recipient rows. */
export function StatusPill({ pill, className }: { pill: Pill; className?: string }) {
  return (
    <Badge variant={TONE_TO_VARIANT[pill.tone]} className={className}>
      {pill.label}
    </Badge>
  );
}

/**
 * Slim stacked bar: sent (faint), delivered, read, replied drawn as overlapping layers so the
 * longest layer is "sent" and the shortest is "replied".
 */
export function DeliveryBar({ campaign, className }: { campaign: Record<string, number>; className?: string }) {
  const p = progressPercents(campaign);
  const layers = [
    { key: 'sent', v: p.sent, fill: 'fill-muted-foreground/30', label: 'Sent' },
    { key: 'delivered', v: p.delivered, fill: 'fill-success/60', label: 'Delivered' },
    { key: 'read', v: p.read, fill: 'fill-info', label: 'Read' },
    { key: 'replied', v: p.replied, fill: 'fill-primary', label: 'Replied' },
  ];
  const summary = `Sent ${p.sent}%, delivered ${p.delivered}%, read ${p.read}%, replied ${p.replied}%`;
  return (
    <div
      role="img"
      aria-label={summary}
      title={summary}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-raised', className)}
    >
      <svg width="100%" height="100%" aria-hidden className="absolute inset-0">
        {layers.map((l) => (
          <rect key={l.key} x="0" y="0" width={`${l.v}%`} height="100%" rx="3" className={l.fill} />
        ))}
      </svg>
    </div>
  );
}

/** null until known; false means sending is switched off for this account. */
export function useDispatchEnabled(): boolean | null {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((s) => setOn(s?.campaignDispatchEnabled === true))
      .catch(() => setOn(null));
  }, []);
  return on;
}
