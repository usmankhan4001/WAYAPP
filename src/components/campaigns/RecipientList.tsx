'use client';

import React, { useState } from 'react';

import { Chip } from '@/components/ui/chip';
import { formatDateTime } from '@/lib/utils';
import { StatusPill } from './CampaignBits';
import { messageStatusPill, translateError } from '@/lib/campaigns/present';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/** Who got the message, what happened, and if it failed, why in plain words. */
export function RecipientList({ messages }: { messages: AnyRecord[] }) {
  const [only, setOnly] = useState<'ALL' | 'FAILED'>('ALL');
  const failedCount = messages.filter((m) => m.status === 'FAILED').length;
  const rows = messages.filter((m) => only === 'ALL' || m.status === 'FAILED');

  return (
    <section className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">People</h3>
          <p className="text-sm text-muted-foreground">Showing the latest {messages.length} messages.</p>
        </div>
        <div className="flex gap-2">
          <Chip selected={only === 'ALL'} count={messages.length} onClick={() => setOnly('ALL')}>All</Chip>
          <Chip selected={only === 'FAILED'} count={failedCount} onClick={() => setOnly('FAILED')}>Failed</Chip>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {messages.length === 0 ? 'Nothing has been sent yet.' : 'No failed messages.'}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((m) => {
            const name = m.contact ? `${m.contact.firstName || ''} ${m.contact.lastName || ''}`.trim() : '';
            const reason = m.status === 'FAILED' ? translateError(m.errorCode, m.errorMessage) : '';
            return (
              <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-foreground">{name || m.phoneNumber}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {name ? `${m.phoneNumber} · ` : ''}
                    {formatDateTime(m.sentAt || m.createdAt)}
                  </p>
                  {reason && <p className="mt-0.5 text-sm text-danger">{reason}</p>}
                </div>
                <StatusPill pill={messageStatusPill(m.status)} className="shrink-0" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
