'use client';

import React, { useState } from 'react';
import { CheckCheck, Check, Clock, AlertCircle, MessageSquare, Search } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface MessageLogTableProps {
  messages: any[];
}

export function MessageLogTable({ messages = [] }: MessageLogTableProps) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filtered = messages.filter((m) => {
    if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const phoneMatch = m.phoneNumber?.toLowerCase().includes(q);
      const nameMatch = `${m.contact?.firstName || ''} ${m.contact?.lastName || ''}`.toLowerCase().includes(q);
      const wamidMatch = m.wamid?.toLowerCase().includes(q);
      return phoneMatch || nameMatch || wamidMatch;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge-slate">Queued</span>;
      case 'SENT':
        return (
          <span className="badge-slate">
            <Check className="w-3 h-3 text-slate-500" />
            <span>Sent</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="badge-emerald">
            <CheckCheck className="w-3 h-3 text-emerald-600" />
            <span>Delivered</span>
          </span>
        );
      case 'READ':
        return (
          <span className="badge-sky">
            <CheckCheck className="w-3 h-3 text-sky-600" />
            <span>Read</span>
          </span>
        );
      case 'REPLIED':
        return (
          <span className="badge-violet">
            <MessageSquare className="w-3 h-3 text-violet-600" />
            <span>Replied</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge-rose">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Failed</span>
          </span>
        );
      default:
        return <span className="badge-slate">{status}</span>;
    }
  };

  return (
    <div className="card-base overflow-hidden">
      {/* Table Filter Controls */}
      <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
          Message Telemetry Logs ({filtered.length})
        </h4>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search phone or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base h-8 pl-8 pr-3 text-xs w-48"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-base h-8 px-2 text-xs w-32"
          >
            <option value="ALL">All Statuses</option>
            <option value="REPLIED">Replied</option>
            <option value="READ">Read (Blue Tick)</option>
            <option value="DELIVERED">Delivered</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-4">Recipient</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Sent</th>
              <th className="py-2.5 px-4">Delivered</th>
              <th className="py-2.5 px-4">Read</th>
              <th className="py-2.5 px-4">Replied</th>
              <th className="py-2.5 px-4">Meta WAMID / Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                  No message logs matching criteria
                </td>
              </tr>
            ) : (
              filtered.map((msg) => {
                const contactName = msg.contact
                  ? `${msg.contact.firstName || ''} ${msg.contact.lastName || ''}`.trim()
                  : 'Customer';

                return (
                  <tr key={msg.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4">
                      <div>
                        <p className="font-medium text-slate-900">{contactName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{msg.phoneNumber}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">{getStatusBadge(msg.status)}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{formatDateTime(msg.sentAt)}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{formatDateTime(msg.deliveredAt)}</td>
                    <td className="py-2.5 px-4 text-[11px]">
                      {msg.readAt ? (
                        <span className="text-sky-700 font-medium">{formatDateTime(msg.readAt)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[11px]">
                      {msg.repliedAt ? (
                        <span className="text-violet-700 font-medium">{formatDateTime(msg.repliedAt)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {msg.status === 'FAILED' ? (
                        <div className="text-rose-600 text-[11px]">
                          <span className="font-mono font-medium block">Code {msg.errorCode}</span>
                          <span className="line-clamp-1 text-slate-500">{msg.errorMessage}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px] block">
                          {msg.wamid || 'pending...'}
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
