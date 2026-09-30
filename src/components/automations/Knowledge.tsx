'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Plus, Eye, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { Advanced, CardListSkeleton, Field, LoadError } from './shared';

export function Knowledge() {
  const confirm = useConfirm();
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [actionError, setActionError] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [viewing, setViewing] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge-bases');
      if (!res.ok) throw new Error('bad status');
      setKbs(await res.json());
      setFailed(false);
    } catch (err) {
      console.warn('[Knowledge] Failed to load:', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nameError = !name.trim() ? 'Give this topic a name.' : undefined;
  const notesError = !notes.trim() ? 'Paste or type what your assistant should know.' : undefined;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameError || notesError) return;
    setBusy(true);
    setSaveError('');
    try {
      const res = await fetch('/api/knowledge-bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rawNotes: notes,
          action: 'GENERATE',
          aiConfig: { provider, apiKey: apiKey.trim() || undefined },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || 'We could not save this topic. Try again in a moment.');
        return;
      }
      setOpen(false);
      setName('');
      setNotes('');
      setApiKey('');
      load();
    } catch {
      setSaveError('We could not save this topic. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (kb: any) => {
    const ok = await confirm({
      title: `Delete "${kb.name}"?`,
      description: 'Assistants using this topic will no longer know it. This cannot be undone.',
      confirmLabel: 'Delete topic',
      destructive: true,
    });
    if (!ok) return;
    setActionError('');
    try {
      const res = await fetch(`/api/knowledge-bases/${kb.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('bad status');
      load();
    } catch (err) {
      console.warn('[Knowledge] Failed to delete:', err);
      setActionError(`We could not delete "${kb.name}". Try again.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" render={<Link href="/automations?tab=assistants" />} aria-label="Back to Automations">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">What your assistants know</h1>
          <p className="text-sm text-muted-foreground">Facts about your business, such as prices, hours and policies.</p>
        </div>
        <Button type="button" onClick={() => { setSubmitted(false); setSaveError(''); setOpen(true); }}>
          <Plus /> Add topic
        </Button>
      </div>

      {actionError && <Alert tone="danger" onDismiss={() => setActionError('')}>{actionError}</Alert>}

      {loading ? (
        <CardListSkeleton />
      ) : failed ? (
        <LoadError what="topics" onRetry={() => { setLoading(true); load(); }} />
      ) : kbs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nothing saved yet"
          description="Paste your prices, opening hours or common answers once and your assistants can use them."
          actionLabel="Add your first topic"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {kbs.map((kb) => (
            <Card key={kb.id} className="space-y-2 p-4">
              <h3 className="text-base font-semibold text-foreground">{kb.name}</h3>
              <p className="line-clamp-3 text-sm text-muted-foreground">{kb.contentMarkdown}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setViewing(kb)}>
                  <Eye /> Read
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-9 text-destructive" onClick={() => remove(kb)}>
                  <Trash2 /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BottomSheet
        open={open}
        onOpenChange={(o) => !o && setOpen(false)}
        title="Add a topic"
        description="Paste what your assistant should know. We tidy it up for you."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="kb-form" disabled={busy}>
              {busy ? 'Saving...' : 'Save topic'}
            </Button>
          </>
        }
      >
        <form id="kb-form" onSubmit={save} className="space-y-4" noValidate>
          {saveError && <Alert tone="danger">{saveError}</Alert>}
          <Field label="Name" htmlFor="kb-name" error={submitted ? nameError : undefined}>
            <Input id="kb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Prices and opening hours" />
          </Field>
          <Field label="What it should know" htmlFor="kb-notes" error={submitted ? notesError : undefined}>
            <Textarea id="kb-notes" rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste text from your website, a price list, or common questions and answers." />
          </Field>
          <Advanced>
            <Field label="AI provider" htmlFor="kb-prov">
              <select id="kb-prov" value={provider} onChange={(e) => setProvider(e.target.value)} className="input-base h-11">
                <option value="gemini">Google Gemini (recommended)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </Field>
            <Field label="Access key" htmlFor="kb-key" hint="Leave empty to use the key set up for your account.">
              <Input id="kb-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </Field>
          </Advanced>
        </form>
      </BottomSheet>

      <BottomSheet
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        size="xl"
        title={viewing?.name}
        description="Assistants that use this topic answer from the text below."
      >
        {viewing && <div className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm text-foreground">{viewing.contentMarkdown}</div>}
      </BottomSheet>
    </div>
  );
}
