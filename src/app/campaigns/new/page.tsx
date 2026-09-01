'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { CampaignWizard } from '@/components/campaigns/CampaignWizard';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default function NewCampaignPage() {
  const [templates, setTemplates] = useState<AnyRecord[]>([]);
  const [groups, setGroups] = useState<AnyRecord[]>([]);
  const [tags, setTags] = useState<AnyRecord[]>([]);
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <Skeleton lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" render={<Link href="/campaigns" />} aria-label="Back to campaigns">
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">New WhatsApp template broadcast</h1>
          <p className="text-xs text-muted-foreground">Configure audience criteria, template and variable mappings.</p>
        </div>
      </div>

      <CampaignWizard templates={templates} groups={groups} tags={tags} />
    </div>
  );
}
