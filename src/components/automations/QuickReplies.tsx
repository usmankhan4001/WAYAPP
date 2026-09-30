'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Sparkles, Zap } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/chip';
import { Alert } from '@/components/ui/alert';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { describeRule, safeJson, splitKeywords, validateRule } from '@/lib/automations/present';
import { Advanced, AutomationCard, CardListSkeleton, Field, LoadError } from './shared';

type MatchType = 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'REGEX' | 'ANY_INBOUND';
type ActionType = 'SEND_TEXT' | 'SEND_TEMPLATE' | 'ADD_TAG' | 'ASSIGN_GROUP';

// Starter ideas. Each one only pre-fills the form; nothing is created until the owner saves.
const IDEAS = [
  {
    label: 'Prices',
    name: 'Answer price questions',
    matchType: 'CONTAINS' as MatchType,
    keywords: 'price, pricing, cost, how much',
    text: 'Thanks for asking. Our prices are here: https://example.com/pricing. Tell us what you need and we will send a quote.',
    tag: 'Price enquiry',
  },
  {
    label: 'Opening hours',
    name: 'Opening hours',
    matchType: 'CONTAINS' as MatchType,
    keywords: 'hours, open, opening, close',
    text: 'We are open Monday to Saturday, 9am to 6pm. Leave a message any time and we will reply when we are back.',
    tag: '',
  },
  {
    label: 'Book a visit',
    name: 'Book a visit',
    matchType: 'CONTAINS' as MatchType,
    keywords: 'book, booking, appointment, visit, viewing',
    text: 'We would love to see you. Which day works best for you this week?',
    tag: 'Wants to book',
  },
  {
    label: 'Welcome',
    name: 'Welcome new customers',
    matchType: 'ANY_INBOUND' as MatchType,
    keywords: '',
    text: 'Hello and welcome. How can we help you today?',
    tag: '',
  },
];

export function QuickReplies() {
  const confirm = useConfirm();
  const [rules, setRules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [actionError, setActionError] = useState('');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('CONTAINS');
  const [keywords, setKeywords] = useState('');
  const [actionType, setActionType] = useState<ActionType>('SEND_TEXT');
  const [text, setText] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [tagName, setTagName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/automations');
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      setRules(data.automations || []);
      setFailed(false);
    } catch (error) {
      console.warn('[Automations] Failed to fetch automations:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setTemplates(d))
      .catch((e) => console.warn('[Automations] templates:', e));
    fetch('/api/groups')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setGroups(d))
      .catch((e) => console.warn('[Automations] groups:', e));
  }, [load]);

  const form = { name, matchType, keywords, actionType, text, templateName, tagName, groupId };
  const errors = validateRule(form);

  const openNew = (idea?: (typeof IDEAS)[number]) => {
    setEditingId(null);
    setName(idea?.name || '');
    setDescription('');
    setMatchType(idea?.matchType || 'CONTAINS');
    setKeywords(idea?.keywords || '');
    setActionType('SEND_TEXT');
    setText(idea?.text || '');
    setTemplateName('');
    setTagName(idea?.tag || '');
    setGroupId('');
    setSubmitted(false);
    setSaveError('');
    setOpen(true);
  };

  const openEdit = (rule: any) => {
    const trigger = safeJson<any>(rule.triggerConfig, {});
    const action = safeJson<any[]>(rule.actionsJson, [])[0] || {};
    setEditingId(rule.id);
    setName(rule.name || '');
    setDescription(rule.description || '');
    setMatchType(trigger.matchType || 'CONTAINS');
    setKeywords((trigger.keywords || []).join(', '));
    setActionType(action.type || 'SEND_TEXT');
    setText(action.payload?.text || '');
    setTemplateName(action.payload?.templateName || '');
    setTagName(action.payload?.tagName || '');
    setGroupId(action.payload?.groupId || '');
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
    const body = {
      name: name.trim(),
      description,
      triggerType: 'KEYWORD_MATCH',
      triggerConfig: { matchType, keywords: splitKeywords(keywords) },
      actionsJson: [
        {
          type: actionType,
          payload: {
            text: actionType === 'SEND_TEXT' ? text : undefined,
            templateName: actionType === 'SEND_TEMPLATE' ? templateName : undefined,
            tagName: actionType === 'ADD_TAG' ? tagName : undefined,
            groupId: actionType === 'ASSIGN_GROUP' ? groupId : undefined,
          },
        },
      ],
      ...(editingId ? {} : { isActive: true }),
    };
    try {
      const res = await fetch(editingId ? `/api/automations/${editingId}` : '/api/automations', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('bad status');
      setOpen(false);
      load();
    } catch (error) {
      console.warn('[Automations] Failed to save rule:', error);
      setSaveError('We could not save this reply. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule: any, next: boolean) => {
    setActionError('');
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, isActive: next } : r)));
    try {
      const res = await fetch(`/api/automations/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) throw new Error('bad status');
    } catch (error) {
      console.warn('[Automations] Failed to toggle rule:', error);
      setActionError(`We could not ${next ? 'turn on' : 'pause'} "${rule.name}". Try again.`);
      load();
    }
  };

  const remove = async (rule: any) => {
    const ok = await confirm({
      title: `Delete "${rule.name}"?`,
      description: 'Customers will stop getting this automatic reply. This cannot be undone.',
      confirmLabel: 'Delete reply',
      destructive: true,
    });
    if (!ok) return;
    setActionError('');
    try {
      const res = await fetch(`/api/automations/${rule.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('bad status');
      load();
    } catch (error) {
      console.warn('[Automations] Failed to delete rule:', error);
      setActionError(`We could not delete "${rule.name}". Try again.`);
    }
  };

  const show = submitted;

  return (
    <section className="space-y-4" aria-label="Quick replies">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Reply automatically when a customer uses certain words, or tag them so you can follow up.
        </p>
        <Button type="button" onClick={() => openNew()} className="shrink-0">
          <Plus /> New reply
        </Button>
      </div>

      {actionError && <Alert tone="danger" onDismiss={() => setActionError('')}>{actionError}</Alert>}

      {loading ? (
        <CardListSkeleton />
      ) : failed ? (
        <LoadError what="quick replies" onRetry={() => { setLoading(true); load(); }} />
      ) : rules.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={Zap}
            title="No quick replies yet"
            description="Answer common questions for your customers automatically. Start from an idea below or write your own."
            actionLabel="Create your first reply"
            onAction={() => openNew()}
          />
          <IdeaChips onPick={openNew} />
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {rules.map((rule) => {
              const d = describeRule(rule, groups);
              return (
                <AutomationCard
                  key={rule.id}
                  title={rule.name}
                  description={rule.description || undefined}
                  lines={[
                    { label: 'When', text: d.when.replace(/^When /, '') },
                    { label: 'Then', text: d.then },
                  ]}
                  meta={rule.executionCount ? `Sent ${rule.executionCount} times` : 'Not used yet'}
                  active={!!rule.isActive}
                  onToggle={(v) => toggle(rule, v)}
                  onEdit={() => openEdit(rule)}
                  onDelete={() => remove(rule)}
                />
              );
            })}
          </div>
          <IdeaChips onPick={openNew} />
        </>
      )}

      <BottomSheet
        open={open}
        onOpenChange={(o) => !o && setOpen(false)}
        title={editingId ? 'Edit quick reply' : 'New quick reply'}
        description="Choose what customers say, then what happens."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="quick-reply-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save reply'}
            </Button>
          </>
        }
      >
        <form id="quick-reply-form" onSubmit={save} className="space-y-4" noValidate>
          {saveError && <Alert tone="danger">{saveError}</Alert>}
          <Field label="Name" htmlFor="qr-name" error={show ? errors.name : undefined}>
            <Input id="qr-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Answer price questions" />
          </Field>

          <Field label="When a customer writes" htmlFor="qr-when">
            <select id="qr-when" value={matchType} onChange={(e) => setMatchType(e.target.value as MatchType)} className="input-base h-11">
              <option value="CONTAINS">Any of my words</option>
              <option value="EXACT">Exactly my word</option>
              <option value="STARTS_WITH">Starts with my word</option>
              <option value="ANY_INBOUND">Anything (every new message)</option>
            </select>
          </Field>
          {matchType !== 'ANY_INBOUND' && (
            <Field
              label="Words to look for"
              htmlFor="qr-words"
              hint="Separate with commas, for example: price, cost, how much"
              error={show ? errors.keywords : undefined}
            >
              <Input id="qr-words" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="price, cost, how much" />
            </Field>
          )}

          <Field label="What should happen" htmlFor="qr-action">
            <select id="qr-action" value={actionType} onChange={(e) => setActionType(e.target.value as ActionType)} className="input-base h-11">
              <option value="SEND_TEXT">Send a reply</option>
              <option value="SEND_TEMPLATE">Send an approved message</option>
              <option value="ADD_TAG">Add a label to the customer</option>
              <option value="ASSIGN_GROUP">Put the customer in a group</option>
            </select>
          </Field>
          {actionType === 'SEND_TEXT' && (
            <Field label="Your reply" htmlFor="qr-text" error={show ? errors.action : undefined}>
              <Textarea id="qr-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type the message customers will get" />
            </Field>
          )}
          {actionType === 'SEND_TEMPLATE' && (
            <Field label="Approved message" htmlFor="qr-tpl" error={show ? errors.action : undefined}>
              <select id="qr-tpl" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="input-base h-11">
                <option value="">Choose one</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {actionType === 'ADD_TAG' && (
            <Field label="Label" htmlFor="qr-tag" error={show ? errors.action : undefined}>
              <Input id="qr-tag" value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="For example: Hot lead" />
            </Field>
          )}
          {actionType === 'ASSIGN_GROUP' && (
            <Field
              label="Group"
              htmlFor="qr-group"
              hint={groups.length === 0 ? 'You have no groups yet. Create one in Contacts first.' : undefined}
              error={show ? errors.action : undefined}
            >
              <select id="qr-group" value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-base h-11">
                <option value="">Choose one</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Advanced>
            <Field label="Note to yourself" htmlFor="qr-desc" hint="Only your team sees this.">
              <Input id="qr-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Matching style" htmlFor="qr-adv-match" hint="Pattern matching is for technical users. Words are matched without regard to capital letters.">
              <select id="qr-adv-match" value={matchType} onChange={(e) => setMatchType(e.target.value as MatchType)} className="input-base h-11">
                <option value="CONTAINS">Any of my words</option>
                <option value="EXACT">Exactly my word</option>
                <option value="STARTS_WITH">Starts with my word</option>
                <option value="REGEX">Custom pattern</option>
                <option value="ANY_INBOUND">Anything</option>
              </select>
            </Field>
          </Advanced>
        </form>
      </BottomSheet>
    </section>
  );
}

function IdeaChips({ onPick }: { onPick: (idea: (typeof IDEAS)[number]) => void }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Sparkles className="size-4 text-muted-foreground" aria-hidden /> Start from an idea
      </p>
      <div className="flex flex-wrap gap-2">
        {IDEAS.map((idea) => (
          <Chip key={idea.label} onClick={() => onPick(idea)}>
            {idea.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
