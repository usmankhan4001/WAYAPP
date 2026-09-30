'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { CampaignWizard } from '@/components/campaigns/CampaignWizard';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default function NewCampaignPage() {
  const [templates, setTemplates] = useState<AnyRecord[]>([]);
  const [groups, setGroups] = useState<AnyRecord[]>([]);
  const [tags, setTags] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
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
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" render={<Link href="/campaigns" />} aria-label="Back to broadcasts">
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New broadcast</h1>
      </div>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton width={220} height={20} />
          <SkeletonCard />
          <Skeleton lines={3} />
        </div>
      ) : failed ? (
        <Alert
          tone="danger"
          title="We could not load your messages and contacts"
          action={
            <Button variant="outline" onClick={load}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Alert>
      ) : (
        <CampaignWizard templates={templates} groups={groups} tags={tags} />
      )}
    </div>
  );
}
