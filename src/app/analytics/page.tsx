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
} from 'lucide-react';
import { ConversionFunnelChart } from '@/components/analytics/ConversionFunnelChart';
import { VolumeTrendsChart } from '@/components/analytics/VolumeTrendsChart';
import { MessageLogTable } from '@/components/analytics/MessageLogTable';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const fetchAnalytics = () => {
    fetch('/api/analytics')
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
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery & Engagement Analytics</h1>
            <InfoTooltip content="Real-time telemetry ingested via Meta Webhooks, tracking message statuses from dispatch to double blue ticks and replies." />
          </div>
          <p className="text-xs text-slate-500">
            Real-time webhook telemetry across Sent, Delivered, Read (Blue Ticks), and Inbound Replied states
          </p>
        </div>

        <Tooltip content="Refetch latest analytics and delivery receipts from the database.">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Telemetry</span>
          </button>
        </Tooltip>
      </div>

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
            {summary.totalDelivered?.toLocaleString()} recipient devices reached
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
    </div>
  );
}
