'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCheck,
  Eye,
  MessageSquare,
  AlertCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Zap,
  Calendar,
  Layers,
} from 'lucide-react';
import { ConversionFunnelChart } from '@/components/analytics/ConversionFunnelChart';
import { VolumeTrendsChart } from '@/components/analytics/VolumeTrendsChart';
import { MessageLogTable } from '@/components/analytics/MessageLogTable';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const fetchAnalytics = (selectedRange = range) => {
    setLoading(true);
    fetch(`/api/analytics?range=${selectedRange}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        if (json?.recentCampaigns?.[0]?.id) {
          fetch(`/api/campaigns/${json.recentCampaigns[0].id}`)
            .then((r) => r.json())
            .then((cData) => setRecentLogs(cData.campaign?.messages || []))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const summary = data?.summary || {};
  const categoryCounts = data?.categoryCounts || {
    MARKETING: 0,
    UTILITY: 0,
    AUTHENTICATION: 0,
    SERVICE: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery & Engagement Analytics</h1>
            <InfoTooltip content="Real-time telemetry and historical message analytics aggregated from WhatsApp Cloud API delivery receipts and 2-way inbox replies." />
          </div>
          <p className="text-xs text-slate-500">
            Historical message delivery, read rates (blue ticks), customer replies, and Meta category metrics
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Filter Pills */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setRange('7d')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                range === '7d' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setRange('30d')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                range === '30d' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setRange('90d')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                range === '90d' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3 Months
            </button>
            <button
              onClick={() => setRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                range === 'all' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>

          <Tooltip content="Refetch latest analytics and delivery receipts from the database.">
            <button
              onClick={() => fetchAnalytics(range)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span>Refresh</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonChart />
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <div className="flex items-center gap-1">
                  <span>Delivery Rate</span>
                  <InfoTooltip content="Percentage of sent messages successfully received on customer handsets (double grey ticks)." />
                </div>
                <CheckCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 font-mono">{summary.deliveryRate}%</p>
              <p className="text-[11px] text-emerald-700 font-medium">
                {summary.totalDelivered?.toLocaleString()} messages reached devices
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <div className="flex items-center gap-1">
                  <span>Read Rate (Blue Ticks)</span>
                  <InfoTooltip content="Percentage of delivered messages that recipients opened and viewed (double blue ticks)." />
                </div>
                <Eye className="w-4 h-4 text-[#0ea5e9]" />
              </div>
              <p className="text-xl font-bold text-slate-900 font-mono">{summary.readRate}%</p>
              <p className="text-[11px] text-slate-500">
                {summary.totalRead?.toLocaleString()} opened & viewed
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <div className="flex items-center gap-1">
                  <span>Customer Reply Rate</span>
                  <InfoTooltip content="Customer response rate within the 24-hour service conversation window." />
                </div>
                <MessageSquare className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xl font-bold text-purple-700 font-mono">{summary.replyRate}%</p>
              <p className="text-[11px] text-purple-700 font-medium">
                {summary.totalReplied?.toLocaleString()} direct inbound conversations
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <div className="flex items-center gap-1">
                  <span>Meta Error Rate</span>
                  <InfoTooltip content="Messages rejected by Meta (invalid number, template format mismatch, rate limits)." />
                </div>
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xl font-bold text-red-600 font-mono">{summary.failureRate}%</p>
              <p className="text-[11px] text-slate-500">
                {summary.totalFailed?.toLocaleString()} rejected messages
              </p>
            </div>
          </div>

          {/* Meta Conversation Category Breakdown */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Meta Conversation Categories ({range.toUpperCase()})
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Marketing</span>
                <p className="text-lg font-black text-blue-900 font-mono mt-0.5">{categoryCounts.MARKETING || 0}</p>
                <span className="text-[10px] text-blue-600">Promotions & Broadcasts</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Utility</span>
                <p className="text-lg font-black text-emerald-900 font-mono mt-0.5">{categoryCounts.UTILITY || 0}</p>
                <span className="text-[10px] text-emerald-600">Order & Account Updates</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Service (2-Way)</span>
                <p className="text-lg font-black text-purple-900 font-mono mt-0.5">{categoryCounts.SERVICE || 0}</p>
                <span className="text-[10px] text-purple-600">Inbound Live Inquiries</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Auth / OTP</span>
                <p className="text-lg font-black text-amber-900 font-mono mt-0.5">{categoryCounts.AUTHENTICATION || 0}</p>
                <span className="text-[10px] text-amber-600">Verification Codes</span>
              </div>
            </div>
          </div>

          {/* Funnel and Daily Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6">
              <ConversionFunnelChart funnel={data?.funnel || []} />
            </div>
            <div className="lg:col-span-6">
              <VolumeTrendsChart data={data?.dailyVolume || []} />
            </div>
          </div>

          {/* Failure Reason Breakdown Card */}
          {data?.errorBreakdown?.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Meta WhatsApp Failure Diagnoser</h3>
                <InfoTooltip content="Detailed breakdown of error codes returned by Meta Graph API and Webhooks." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.errorBreakdown.map((err: any) => (
                  <div key={err.code} className="p-3 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-red-700">Code {err.code}</span>
                      <span className="text-xs font-bold text-red-800">{err.count} errors</span>
                    </div>
                    <p className="text-[11px] text-red-600 line-clamp-2">{err.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Message Log Inspector */}
          <MessageLogTable messages={recentLogs} />
        </>
      )}
    </div>
  );
}
