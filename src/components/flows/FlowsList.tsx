'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitMerge, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchField } from '@/components/ui/search-field';
import { Alert } from '@/components/ui/alert';
import { describeFlow } from '@/lib/automations/present';
import { AutomationCard, CardListSkeleton, Field, LoadError } from '@/components/automations/shared';

export function FlowsList() {
  const router = useRouter();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/flows');
      if (!res.ok) throw new Error('bad status');
      setFlows(await res.json());
      setFailed(false);
    } catch (err) {
      console.warn('[Flows] Failed to load:', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      router.push(`/flows/${data.flow.id}`);
    } catch (err) {
      console.warn('[Flows] Failed to create:', err);
      setCreateError('We could not create this flow. Check your connection and try again.');
      setCreating(false);
    }
  };

  const toggle = async (flow: any, next: boolean) => {
    setActionError('');
    // The builder refuses to publish a flow that has no starting step; keep that rule here.
    if (next && !flowHasStart(flow)) {
      setActionError(`"${flow.name}" needs a starting step before it can be switched on. Open it and add one.`);
      return;
    }
    setFlows((fs) => fs.map((f) => (f.id === flow.id ? { ...f, status: next ? 'PUBLISHED' : 'DRAFT' } : f)));
    try {
      const res = await fetch(`/api/flows/${flow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next ? 'PUBLISHED' : 'DRAFT' }),
      });
      if (!res.ok) throw new Error('bad status');
    } catch (err) {
      console.warn('[Flows] Failed to toggle:', err);
      setActionError(`We could not ${next ? 'turn on' : 'pause'} "${flow.name}". Try again.`);
      load();
    }
  };

  const q = query.trim().toLowerCase();
  const shown = flows.filter((f) => !q || f.name.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q));

  return (
    <section className="space-y-4" aria-label="Flows">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Flows are step-by-step conversations you lay out on a canvas, such as asking a few questions before handing over to you.
        </p>
        <Button type="button" onClick={() => { setName(''); setDescription(''); setSubmitted(false); setCreateError(''); setOpen(true); }} className="shrink-0">
          <Plus /> New flow
        </Button>
      </div>

      {flows.length > 4 && <SearchField value={query} onValueChange={setQuery} placeholder="Search flows" />}
      {actionError && <Alert tone="danger" onDismiss={() => setActionError('')}>{actionError}</Alert>}

      {loading ? (
        <CardListSkeleton />
      ) : failed ? (
        <LoadError what="flows" onRetry={() => { setLoading(true); load(); }} />
      ) : flows.length === 0 ? (
        <EmptyState
          icon={GitMerge}
          title="No flows yet"
          description="Build a conversation that asks customers a few questions and then tags or routes them."
          actionLabel="Create your first flow"
          onAction={() => setOpen(true)}
        />
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No flows match "{query}".</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((flow) => (
            <AutomationCard
              key={flow.id}
              title={flow.name}
              description={describeFlow(flow)}
              meta={flow._count?.runs ? `Run ${flow._count.runs} times` : 'Not used yet'}
              active={flow.status === 'PUBLISHED'}
              onToggle={(v) => toggle(flow, v)}
              onTry={() => router.push(`/flows/${flow.id}`)}
              editHref={`/flows/${flow.id}`}
            />
          ))}
        </div>
      )}

      <BottomSheet
        open={open}
        onOpenChange={(o) => !o && setOpen(false)}
        title="New flow"
        description="Name it now. You design the steps on the next screen."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="flow-form" disabled={creating}>
              {creating ? 'Creating...' : 'Create and open'}
            </Button>
          </>
        }
      >
        <form id="flow-form" onSubmit={create} className="space-y-4" noValidate>
          {createError && <Alert tone="danger">{createError}</Alert>}
          <Field label="Name" htmlFor="fl-name" error={submitted && !name.trim() ? 'Give this flow a name.' : undefined}>
            <Input id="fl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Ask new customers what they need" />
          </Field>
          <Field label="What is it for? (optional)" htmlFor="fl-desc">
            <Input id="fl-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </form>
      </BottomSheet>
    </section>
  );
}

function flowHasStart(flow: any): boolean {
  try {
    return (JSON.parse(flow.nodesJson || '[]') as any[]).some((n) => n?.type === 'trigger');
  } catch {
    return false;
  }
}
