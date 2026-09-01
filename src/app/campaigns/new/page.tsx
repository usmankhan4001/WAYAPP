'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CampaignWizard } from '@/components/campaigns/CampaignWizard';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';

export default function NewCampaignPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/templates').then((res) => res.json()),
      fetch('/api/groups').then((res) => res.json()),
      fetch('/api/tags').then((res) => res.json()),
    ])
      .then(([tpls, grps, tgs]) => {
        setTemplates(Array.isArray(tpls) ? tpls : []);
        setGroups(Array.isArray(grps) ? grps : []);
        setTags(Array.isArray(tgs) ? tgs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton width={220} height={20} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="card-base p-5 space-y-3">
          <Skeleton lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/campaigns"
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">New WhatsApp Template Broadcast</h1>
          <p className="text-xs text-slate-500">Configure audience criteria, template, and variable mappings</p>
        </div>
      </div>

      <CampaignWizard templates={templates} groups={groups} tags={tags} />
    </div>
  );
}
