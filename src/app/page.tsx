'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  Users,
  FileText,
  BarChart3,
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
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ])
      .then(([analyticsData, settingsData]) => {
        setData(analyticsData);
        setSettings(settingsData);
      })
      .catch(() => setError('Unable to load dashboard data. Please check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Dashboard Unavailable</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const hasCredentials = Boolean(settings?.phoneNumberId && settings?.accessToken);
  const hasTemplates = (summary.totalTemplates || 0) > 0;
  const hasContacts = (summary.totalContacts || 0) > 0;
  const hasCampaigns = (summary.totalCampaigns || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Top Walkthrough Checklist */}
      <SetupWalkthrough
        hasCredentials={hasCredentials}
        hasTemplates={hasTemplates}
        hasContacts={hasContacts}
        hasCampaigns={hasCampaigns}
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Targeted */}
        <div className="card-base p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Targeted</span>
            <Send className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl font-semibold text-slate-900 font-mono">
            {summary.totalMessages?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {summary.totalCampaigns || 0} campaigns
          </p>
        </div>

        {/* Metric 2: Delivery Rate */}
        <div className="card-base p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Delivery Rate</span>
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-semibold text-slate-900 font-mono">{summary.deliveryRate}%</p>
          <p className="text-[11px] text-emerald-700 font-medium">
            {summary.totalDelivered?.toLocaleString()} delivered
          </p>
        </div>

        {/* Metric 3: Read Rate */}
        <div className="card-base p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Read Rate</span>
            <Eye className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <p className="text-xl font-semibold text-slate-900 font-mono">{summary.readRate}%</p>
          <p className="text-[11px] text-sky-700 font-medium">
            {summary.totalRead?.toLocaleString()} read
          </p>
        </div>

        {/* Metric 4: Reply Rate */}
        <div className="card-base p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Reply Rate</span>
            <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <p className="text-xl font-semibold text-slate-900 font-mono">{summary.replyRate}%</p>
          <p className="text-[11px] text-violet-700 font-medium">
            {summary.totalReplied?.toLocaleString()} replies
          </p>
        </div>

        {/* Metric 5: Failure Rate */}
        <div className="card-base p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Failed / Bounces</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <p className="text-xl font-semibold text-slate-900 font-mono">{summary.failureRate}%</p>
          <p className="text-[11px] text-rose-600 font-medium">
            {summary.totalFailed?.toLocaleString()} errors
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6">
          <ConversionFunnelChart funnel={data?.funnel || []} />
        </div>
        <div className="lg:col-span-6">
          <VolumeTrendsChart data={data?.dailyVolume || []} />
        </div>
      </div>

      {/* Recent Broadcasts & Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Campaigns Table */}
        <div className="lg:col-span-8 card-base p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Recent Broadcast Campaigns
            </h3>
            <Link
              href="/campaigns"
              className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {!data?.recentCampaigns || data.recentCampaigns.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Send className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-700">No campaigns launched yet</p>
                <p className="text-[11px] text-slate-500">
                  Ready to send your first message? Choose an approved template and launch a broadcast.
                </p>
                <Link href="/campaigns/new" className="btn-primary h-8 px-3 text-xs mt-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Campaign</span>
                </Link>
              </div>
            ) : (
              data.recentCampaigns.map((c: any) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 transition-colors">
                  <div className="space-y-0.5">
                    <Link href={`/campaigns/${c.id}`} className="text-xs font-medium text-slate-900 hover:text-emerald-700">
                      {c.name}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      Template: <span className="font-mono text-slate-700">{c.template?.name}</span> • {formatDateTime(c.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="font-semibold text-slate-900">{c.totalContacts}</span>
                      <span className="text-[11px] text-slate-400 block">contacts</span>
                    </div>
                    <span
                      className={
                        c.status === 'COMPLETED'
                          ? 'badge-emerald'
                          : c.status === 'RUNNING'
                          ? 'badge-sky'
                          : 'badge-slate'
                      }
                    >
                      {c.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="lg:col-span-4 card-base p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-100">
            Quick Shortcuts
          </h3>

          <div className="space-y-2 pt-1">
            <Link
              href="/contacts"
              className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-slate-900">Contacts & Groups</h4>
                  <p className="text-[11px] text-slate-500">
                    {summary.totalContacts || 0} Contacts • {summary.totalGroups || 0} Groups
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/templates"
              className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-slate-900">Meta Templates</h4>
                  <p className="text-[11px] text-slate-500">
                    {summary.totalTemplates || 0} Approved Templates
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/inbox"
              className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-slate-900">Live 2-Way Inbox</h4>
                  <p className="text-[11px] text-slate-500">
                    Customer response threads
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
