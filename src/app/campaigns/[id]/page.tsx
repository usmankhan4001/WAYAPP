'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Send, CheckCheck, Eye, MessageSquare, AlertCircle } from 'lucide-react';
import { LiveProgressCard } from '@/components/campaigns/LiveProgressCard';
import { MessageLogTable } from '@/components/analytics/MessageLogTable';
import { WhatsAppMockupPreview } from '@/components/templates/WhatsAppMockupPreview';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaign = () => {
    fetch(`/api/campaigns/${id}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaign();
    const interval = setInterval(fetchCampaign, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleAction = async (action: 'START' | 'PAUSE' | 'RESUME' | 'CANCEL') => {
    try {
      await fetch(`/api/campaigns/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchCampaign();
    } catch {}
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </div>
    );
  }

  if (!data?.campaign) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-bold text-slate-800">Campaign not found</p>
        <Link href="/campaigns" className="text-xs text-emerald-600 font-semibold mt-2 inline-block">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const { campaign, stats } = data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{campaign.name}</h1>
            <p className="text-xs text-slate-500">
              Template: <span className="font-mono text-slate-700">{campaign.template?.name}</span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchCampaign}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Live Progress Card */}
      <LiveProgressCard campaign={campaign} stats={stats} onAction={handleAction} />

      {/* Grid: Message Logs & Template Mockup Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <MessageLogTable messages={campaign.messages || []} />
        </div>

        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 self-start">
            Broadcast Template
          </h3>
          <WhatsAppMockupPreview
            templateName={campaign.template?.name}
            category={campaign.template?.category}
            components={campaign.template?.components}
            headerMediaUrl={campaign.headerMediaUrl}
            sampleVariables={{ '1': 'Customer', '2': 'Company', '3': 'PROMO' }}
          />
        </div>
      </div>
    </div>
  );
}
