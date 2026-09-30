'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { AUTOMATIONS_OFF_MESSAGE } from '@/lib/automations/present';
import { QuickReplies } from './QuickReplies';
import { Assistants } from './Assistants';
import { FlowsList } from '@/components/flows/FlowsList';

const TABS = [
  { value: 'quick', label: 'Quick replies' },
  { value: 'flows', label: 'Flows' },
  { value: 'assistants', label: 'Assistants' },
] as const;
type Tab = (typeof TABS)[number]['value'];

/** Tells the owner, once, that nothing here answers customers while automatic replies are off. */
export function AutomationsOffAlert() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => alive && setOff(s?.inboundAutomationsEnabled === false))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  if (!off) return null;
  return <Alert tone="warning">{AUTOMATIONS_OFF_MESSAGE}</Alert>;
}

export function AutomationsHome() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.some((t) => t.value === raw) ? (raw as Tab) : 'quick';

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Automations</h1>
        <p className="text-sm text-muted-foreground">Let WayApp answer common questions and follow up, so you do not have to.</p>
      </div>
      <AutomationsOffAlert />
      <FilterTabs options={TABS} value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })} />
      {tab === 'quick' && <QuickReplies />}
      {tab === 'flows' && <FlowsList />}
      {tab === 'assistants' && <Assistants />}
    </div>
  );
}
