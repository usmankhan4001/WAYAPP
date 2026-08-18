'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

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
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <Send className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-xs font-semibold text-slate-800">No campaigns found</h3>
            <p className="text-[11px] text-slate-500">Create your first broadcast to engage your WhatsApp audience.</p>
            <Link href="/campaigns/new" className="btn-primary h-8 px-3 text-xs mt-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                          className="font-medium text-slate-900 hover:text-emerald-700 block text-xs"
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
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-900">
                        {c.totalContacts}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-700 font-mono">
                        {c.sentCount}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-mono font-medium">
                        {c.deliveredCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-sky-700 font-medium">
                        {readRate}% ({c.readCount})
                      </td>
                      <td className="py-3 px-4 text-center text-violet-700 font-mono font-medium">
                        {c.repliedCount}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {formatDateTime(c.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/campaigns/${c.id}`}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="View Campaign Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
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
        )}
      </div>
    </div>
  );
}
