'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { SkeletonTableRow } from '@/components/ui/Skeleton';
import { EmptyCampaigns } from '@/components/ui/EmptyState';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
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

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === 'ALL') return true;
    return c.status === filter;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      fetchCampaigns();
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Broadcast Campaigns</h1>
          <p className="text-xs text-slate-500">
            Launch, schedule, and track rate-limited WhatsApp template broadcasts
          </p>
        </div>

        <Link href="/campaigns/new" className="btn-primary self-start">
          <Plus className="w-3.5 h-3.5" />
          <span>New Broadcast</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 text-xs">
        {['ALL', 'RUNNING', 'COMPLETED', 'QUEUED', 'DRAFT', 'PAUSED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Campaigns Table */}
      <div className="card-base overflow-hidden">
        {loading ? (
          <table className="w-full text-left border-collapse text-xs">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTableRow key={i} columns={8} />
              ))}
            </tbody>
          </table>
        ) : filteredCampaigns.length === 0 ? (
          <EmptyCampaigns />
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-2.5 px-4">Campaign & Template</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-center">Recipients</th>
                    <th className="py-2.5 px-4 text-center">Sent</th>
                    <th className="py-2.5 px-4 text-center">Delivered</th>
                    <th className="py-2.5 px-4 text-center">Read Rate</th>
                    <th className="py-2.5 px-4 text-center">Replies</th>
                    <th className="py-2.5 px-4">Created At</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCampaigns.map((c) => {
                    const readRate = c.deliveredCount > 0 ? Math.round((c.readCount / c.deliveredCount) * 100) : 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/campaigns/${c.id}`}
                            className="font-semibold text-slate-900 hover:text-emerald-700 block text-xs"
                          >
                            {c.name}
                          </Link>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {c.template?.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={
                              c.status === 'COMPLETED'
                                ? 'badge-emerald'
                                : c.status === 'RUNNING'
                                ? 'badge-sky'
                                : c.status === 'PAUSED'
                                ? 'badge-amber'
                                : 'badge-slate'
                            }
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-900">
                          {c.totalContacts}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-700 font-mono">
                          {c.sentCount}
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-700 font-mono font-semibold">
                          {c.deliveredCount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-sky-700 font-semibold">
                          {readRate}% ({c.readCount})
                        </td>
                        <td className="py-3 px-4 text-center text-violet-700 font-mono font-semibold">
                          {c.repliedCount}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {formatDateTime(c.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/campaigns/${c.id}`}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="View Campaign Details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                              title="Delete Campaign"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredCampaigns.map((c) => {
                const readRate = c.deliveredCount > 0 ? Math.round((c.readCount / c.deliveredCount) * 100) : 0;
                const progressPct = c.totalContacts > 0 ? Math.round((c.sentCount / c.totalContacts) * 100) : 0;

                return (
                  <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="font-bold text-slate-900 hover:text-emerald-700 text-sm block truncate"
                        >
                          {c.name}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {c.template?.name}
                        </span>
                      </div>
                      <span
                        className={
                          c.status === 'COMPLETED'
                            ? 'badge-emerald shrink-0'
                            : c.status === 'RUNNING'
                            ? 'badge-sky shrink-0'
                            : c.status === 'PAUSED'
                            ? 'badge-amber shrink-0'
                            : 'badge-slate shrink-0'
                        }
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Progress ({progressPct}%)</span>
                        <span className="font-mono">{c.sentCount} / {c.totalContacts}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Mobile Metric Badges */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Delivered</span>
                        <span className="text-xs font-mono font-bold text-emerald-700">{c.deliveredCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Read Rate</span>
                        <span className="text-xs font-mono font-bold text-sky-700">{readRate}%</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">Replies</span>
                        <span className="text-xs font-mono font-bold text-violet-700">{c.repliedCount}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(c.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/campaigns/${c.id}`}
                          className="px-3 py-1 rounded-lg bg-slate-900 text-white font-semibold text-xs inline-flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <span>Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
