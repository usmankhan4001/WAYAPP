'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Bot, Plus, Send } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { BOT_KIND_LABEL, describeBot, safeJson, splitKeywords, validateBot } from '@/lib/automations/present';
import { Advanced, AutomationCard, CardListSkeleton, Field, LoadError } from './shared';

const DEFAULT_INSTRUCTIONS = 'You are a friendly customer service assistant on WhatsApp. Answer briefly and politely.';
const KINDS = [
  { value: 'AI', label: 'AI assistant' },
  { value: 'KEYWORD', label: 'Keyword reply' },
  { value: 'HTTP', label: 'Connected service' },
] as const;

export function Assistants() {
  const confirm = useConfirm();
  const [bots, setBots] = useState<any[]>([]);
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [actionError, setActionError] = useState('');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<'AI' | 'KEYWORD' | 'HTTP'>('AI');
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [kbId, setKbId] = useState('');
  const [keywords, setKeywords] = useState('');
  const [matchType, setMatchType] = useState('CONTAINS');
  const [serviceUrl, setServiceUrl] = useState('');
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [testing, setTesting] = useState<any | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [botRes, kbRes] = await Promise.all([fetch('/api/bots'), fetch('/api/knowledge-bases')]);
      if (!botRes.ok) throw new Error('bad status');
      setBots(await botRes.json());
      if (kbRes.ok) setKbs(await kbRes.json());
      setFailed(false);
    } catch (err) {
      console.warn('[Assistants] Failed to load:', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const errors = validateBot({ name, kind, keywords, replyText, instructions, serviceUrl });

  const openNew = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setKind('AI');
    setProvider('gemini');
    setApiKey('');
    setInstructions(DEFAULT_INSTRUCTIONS);
    setKbId('');
    setKeywords('');
    setMatchType('CONTAINS');
    setServiceUrl('');
    setReplyText('');
    setSubmitted(false);
    setSaveError('');
    setOpen(true);
  };

  const openEdit = (bot: any) => {
    const trigger = safeJson<any>(bot.triggerConfig, {});
    const ai = safeJson<any>(bot.aiConfig, {});
    const actions = safeJson<any[]>(bot.actionsJson, []);
    setEditingId(bot.id);
    setName(bot.name || '');
    setDescription(bot.description || '');
    setKind(bot.kind || 'AI');
    setKbId(bot.knowledgeBaseId || '');
    setMatchType(trigger.matchType || 'CONTAINS');
    setKeywords(Array.isArray(trigger.keywords) ? trigger.keywords.join(', ') : '');
    setServiceUrl(trigger.webhookUrl || '');
    setProvider(ai.provider || 'gemini');
    setInstructions(ai.systemPrompt || '');
    setApiKey(ai.hasApiKey ? '••••••••••••' : '');
    setReplyText(actions.find((a) => a.type === 'SEND_TEXT')?.payload?.text || '');
    setSubmitted(false);
    setSaveError('');
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(editingId ? `/api/bots/${editingId}` : '/api/bots', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          kind,
          triggerConfig: {
            matchType,
            keywords: splitKeywords(keywords),
            webhookUrl: kind === 'HTTP' ? serviceUrl.trim() : undefined,
          },
          aiConfig:
            kind === 'AI'
              ? { provider, apiKey: apiKey.trim() && !apiKey.includes('••••') ? apiKey.trim() : undefined, systemPrompt: instructions }
              : undefined,
          actionsJson: kind === 'KEYWORD' ? [{ type: 'SEND_TEXT', payload: { text: replyText } }] : [],
          knowledgeBaseId: kbId || undefined,
          ...(editingId ? {} : { isActive: true }),
        }),
      });
      if (!res.ok) throw new Error('bad status');
      setOpen(false);
      load();
    } catch (err) {
      console.warn('[Assistants] Failed to save:', err);
      setSaveError('We could not save this assistant. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (bot: any, next: boolean) => {
    setActionError('');
    setBots((bs) => bs.map((b) => (b.id === bot.id ? { ...b, isActive: next } : b)));
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) throw new Error('bad status');
    } catch (err) {
      console.warn('[Assistants] Failed to toggle:', err);
      setActionError(`We could not ${next ? 'turn on' : 'pause'} "${bot.name}". Try again.`);
      load();
    }
  };

  const remove = async (bot: any) => {
    const ok = await confirm({
      title: `Delete "${bot.name}"?`,
      description: 'This assistant will stop answering customers and its settings are lost. This cannot be undone.',
      confirmLabel: 'Delete assistant',
      destructive: true,
    });
    if (!ok) return;
    setActionError('');
    try {
      const res = await fetch(`/api/bots/${bot.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('bad status');
      load();
    } catch (err) {
      console.warn('[Assistants] Failed to delete:', err);
      setActionError(`We could not delete "${bot.name}". Try again.`);
    }
  };

  const runTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testing || !testMessage.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/bots/${testing.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMessage.trim() }),
      });
      const data = await res.json();
      setTestResult(res.ok ? data : { error: data.error || 'The test did not work. Try again.' });
    } catch {
      setTestResult({ error: 'The test did not work. Check your connection and try again.' });
    } finally {
      setTestLoading(false);
    }
  };

  const show = submitted;

  return (
    <section className="space-y-4" aria-label="Assistants">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Assistants answer customer questions for you, using what you teach them.
        </p>
        <Button type="button" onClick={openNew} className="shrink-0">
          <Plus /> New assistant
        </Button>
      </div>

      <Card className="flex-row items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <BookOpen className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">What your assistants know</p>
          <p className="text-sm text-muted-foreground">
            {kbs.length === 0 ? 'Add your prices, hours and policies once.' : `${kbs.length} saved ${kbs.length === 1 ? 'topic' : 'topics'}.`}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-9" render={<Link href="/automations/knowledge" />}>
          Manage
        </Button>
      </Card>

      {actionError && <Alert tone="danger" onDismiss={() => setActionError('')}>{actionError}</Alert>}

      {loading ? (
        <CardListSkeleton />
      ) : failed ? (
        <LoadError what="assistants" onRetry={() => { setLoading(true); load(); }} />
      ) : bots.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No assistants yet"
          description="An assistant can answer common questions any time of day, using what you tell it about your business."
          actionLabel="Create your first assistant"
          onAction={openNew}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {bots.map((bot) => (
            <AutomationCard
              key={bot.id}
              title={bot.name}
              badge={BOT_KIND_LABEL[bot.kind] || undefined}
              description={describeBot(bot)}
              meta={bot.executionCount ? `Answered ${bot.executionCount} times` : 'Not used yet'}
              active={!!bot.isActive}
              onToggle={(v) => toggle(bot, v)}
              onTry={() => {
                setTesting(bot);
                setTestMessage('');
                setTestResult(null);
              }}
              onEdit={() => openEdit(bot)}
              onDelete={() => remove(bot)}
            />
          ))}
        </div>
      )}

      <BottomSheet
        open={open}
        onOpenChange={(o) => !o && setOpen(false)}
        title={editingId ? 'Edit assistant' : 'New assistant'}
        description="Pick how it answers, then tell it what to say."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="assistant-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save assistant'}
            </Button>
          </>
        }
      >
        <form id="assistant-form" onSubmit={save} className="space-y-4" noValidate>
          {saveError && <Alert tone="danger">{saveError}</Alert>}
          <Field label="Name" htmlFor="as-name" error={show ? errors.name : undefined}>
            <Input id="as-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Shop helper" />
          </Field>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-foreground">How should it answer?</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="How should it answer">
              {KINDS.map((k) => (
                <Chip key={k.value} selected={kind === k.value} onClick={() => setKind(k.value)}>
                  {k.label}
                </Chip>
              ))}
            </div>
          </div>

          {kind === 'AI' && (
            <>
              <Field
                label="How it should behave"
                htmlFor="as-inst"
                hint="For example: be polite, keep answers short, offer to book a visit."
                error={show ? errors.instructions : undefined}
              >
                <Textarea id="as-inst" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </Field>
              <Field label="What it knows" htmlFor="as-kb" hint="Pick a saved topic so it answers from your own facts.">
                <select id="as-kb" value={kbId} onChange={(e) => setKbId(e.target.value)} className="input-base h-11">
                  <option value="">Nothing specific</option>
                  {kbs.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {kind === 'KEYWORD' && (
            <>
              <Field label="Words to look for" htmlFor="as-words" hint="Separate with commas." error={show ? errors.keywords : undefined}>
                <Input id="as-words" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="price, help, order" />
              </Field>
              <Field label="Its reply" htmlFor="as-reply" error={show ? errors.replyText : undefined}>
                <Textarea id="as-reply" rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Hello, thanks for reaching out." />
              </Field>
            </>
          )}

          {kind === 'HTTP' && (
            <Field
              label="Service address"
              htmlFor="as-url"
              hint="Your developer gives you this address. Messages are passed to it and its answer is sent back."
              error={show ? errors.serviceUrl : undefined}
            >
              <Input id="as-url" inputMode="url" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} placeholder="https://" />
            </Field>
          )}

          <Advanced>
            <Field label="Note to yourself" htmlFor="as-desc" hint="Shown on the card. Leave empty for a standard description.">
              <Input id="as-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            {kind === 'AI' && (
              <>
                <Field label="AI provider" htmlFor="as-prov">
                  <select id="as-prov" value={provider} onChange={(e) => setProvider(e.target.value)} className="input-base h-11">
                    <option value="gemini">Google Gemini (recommended)</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </Field>
                <Field label="Access key" htmlFor="as-key" hint="Stored encrypted. Leave empty to use the key set up for your account.">
                  <Input id="as-key" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                </Field>
              </>
            )}
            {kind !== 'AI' && (
              <Field label="Matching style" htmlFor="as-match">
                <select id="as-match" value={matchType} onChange={(e) => setMatchType(e.target.value)} className="input-base h-11">
                  <option value="CONTAINS">Any of my words</option>
                  <option value="EXACT">Exactly my word</option>
                  <option value="STARTS_WITH">Starts with my word</option>
                  <option value="REGEX">Custom pattern</option>
                  <option value="ANY_INBOUND">Anything</option>
                </select>
              </Field>
            )}
          </Advanced>
        </form>
      </BottomSheet>

      <BottomSheet
        open={!!testing}
        onOpenChange={(o) => !o && setTesting(null)}
        title={testing ? `Try "${testing.name}"` : 'Try it'}
        description="Write a message as a customer would. Nothing is sent to anyone."
      >
        <form onSubmit={runTest} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="For example: What are your prices?"
              aria-label="Test message"
            />
            <Button type="submit" disabled={testLoading || !testMessage.trim()} aria-label="Run test">
              <Send /> {testLoading ? 'Trying...' : 'Try'}
            </Button>
          </div>
          {testResult &&
            (testResult.error ? (
              <Alert tone="danger">{testResult.error}</Alert>
            ) : testResult.triggerMatched === false ? (
              <Alert tone="warning">{testResult.note || 'This message would not start the assistant.'}</Alert>
            ) : (
              <div className="space-y-2 rounded-2xl bg-muted p-4">
                <p className="text-xs font-medium text-muted-foreground">The assistant would reply</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{testResult.reply || 'No reply text.'}</p>
                {testResult.usedKnowledgeBase && <p className="text-xs text-muted-foreground">Answered using your saved topic.</p>}
                {testResult.note && <p className="text-xs text-muted-foreground">{testResult.note}</p>}
              </div>
            ))}
        </form>
      </BottomSheet>
    </section>
  );
}
