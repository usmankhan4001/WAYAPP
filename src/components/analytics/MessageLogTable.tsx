'use client';

import React, { useState } from 'react';
import { CheckCheck, Check, AlertCircle, MessageSquare, Search } from 'lucide-react';

import { formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Message = Record<string, any>;

const STATUS_META: Record<string, { tone: string; label: string; icon?: React.ElementType }> = {
  PENDING: { tone: 'neutral', label: 'Queued' },
  SENT: { tone: 'neutral', label: 'Sent', icon: Check },
  DELIVERED: { tone: 'success', label: 'Delivered', icon: CheckCheck },
  READ: { tone: 'info', label: 'Read', icon: CheckCheck },
  REPLIED: { tone: 'accent', label: 'Replied', icon: MessageSquare },
  FAILED: { tone: 'destructive', label: 'Failed', icon: AlertCircle },
};

export function MessageLogTable({ messages = [] }: { messages: Message[] }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = messages.filter((m) => {
    if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.phoneNumber?.toLowerCase().includes(q) ||
        `${m.contact?.firstName || ''} ${m.contact?.lastName || ''}`.toLowerCase().includes(q) ||
        m.wamid?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderStatus = (status: string) => {
    const meta = STATUS_META[status] ?? { tone: 'neutral', label: status };
    const Icon = meta.icon;
    return (
      <StatusBadge tone={meta.tone}>
        {Icon && <Icon />}
        {meta.label}
      </StatusBadge>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-2.5 border-b border-border p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Message telemetry logs ({filtered.length})
        </h4>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search phone or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 pl-8 text-xs"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 w-32 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="ALL">All statuses</option>
            <option value="REPLIED">Replied</option>
            <option value="READ">Read</option>
            <option value="DELIVERED">Delivered</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5">Recipient</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Sent</th>
              <th className="px-4 py-2.5">Delivered</th>
              <th className="px-4 py-2.5">Read</th>
              <th className="px-4 py-2.5">Replied</th>
              <th className="px-4 py-2.5">Meta WAMID / error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                  No message logs matching criteria
                </td>
              </tr>
            ) : (
              filtered.map((msg) => {
                const contactName = msg.contact
                  ? `${msg.contact.firstName || ''} ${msg.contact.lastName || ''}`.trim() || 'Customer'
                  : 'Customer';
                return (
                  <tr key={msg.id} className="transition-colors hover:bg-accent">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{contactName}</p>
                      <p className="font-mono text-2xs text-muted-foreground">{msg.phoneNumber}</p>
                    </td>
                    <td className="px-4 py-2.5">{renderStatus(msg.status)}</td>
                    <td className="px-4 py-2.5 text-2xs text-muted-foreground">{formatDateTime(msg.sentAt)}</td>
                    <td className="px-4 py-2.5 text-2xs text-muted-foreground">{formatDateTime(msg.deliveredAt)}</td>
                    <td className="px-4 py-2.5 text-2xs">
                      {msg.readAt ? <span className="font-medium text-info">{formatDateTime(msg.readAt)}</span> : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-2xs">
                      {msg.repliedAt ? <span className="font-medium text-accent-foreground">{formatDateTime(msg.repliedAt)}</span> : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {msg.status === 'FAILED' ? (
                        <div className="text-2xs text-destructive">
                          <span className="block font-mono font-medium">Code {msg.errorCode}</span>
                          <span className="line-clamp-1 text-muted-foreground">{msg.errorMessage}</span>
                        </div>
                      ) : (
                        <span className="block max-w-[130px] truncate font-mono text-2xs text-muted-foreground">
                          {msg.wamid || 'pending…'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
