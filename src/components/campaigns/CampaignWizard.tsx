'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowLeft, ArrowRight, Send } from 'lucide-react';

import { WhatsAppMockupPreview } from '../templates/WhatsAppMockupPreview';
import { VariableMapper } from './VariableMapper';
import { useDispatchEnabled } from './CampaignBits';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Card } from '@/components/ui/card';
import {
  BIG_AUDIENCE,
  maskPhone,
  templateInfo,
  toScheduledIso,
  validateStep,
  type WizardState,
} from '@/lib/campaigns/present';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface CampaignWizardProps {
  templates: any[];
  groups: any[];
  tags: any[];
}

const STEPS = [
  { num: 1, title: 'Name', help: 'Give this broadcast a name only you will see, so you can find it later.' },
  { num: 2, title: 'Message', help: 'Pick an approved message and choose what fills in the blanks.' },
  { num: 3, title: 'Audience', help: 'Choose who should get it. The number updates as you choose.' },
  { num: 4, title: 'Review', help: 'Check everything, then choose when to send.' },
] as const;

const FIELD_CLASS =
  'h-11 w-full rounded-[14px] border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

const SAMPLE_FOR: Record<string, string> = {
  firstName: 'Sara',
  lastName: 'Khan',
  fullName: 'Sara Khan',
  phoneNumber: '+971 50 000 0000',
  email: 'sara@example.com',
  'custom.company': 'Apex Trading',
  'custom.city': 'Dubai',
  'custom.order_id': 'A1042',
  'custom.spend': '250',
  'custom.tier': 'Gold',
};

type AudienceMode = 'all' | 'labels' | 'groups';

export function CampaignWizard({ templates = [], groups = [], tags = [] }: CampaignWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  // null until known. When false, sending is switched off and a "launch" only saves a draft.
  const dispatchOn = useDispatchEnabled();

  const [campaignName, setCampaignName] = useState('');
  const [mode, setMode] = useState<AudienceMode>('all');
  const [includeGroupIds, setIncludeGroupIds] = useState<string[]>([]);
  const [includeTagIds, setIncludeTagIds] = useState<string[]>([]);
  const [excludeGroupIds, setExcludeGroupIds] = useState<string[]>([]);
  const [excludeTagIds, setExcludeTagIds] = useState<string[]>([]);
  const sendToAll = mode === 'all';

  const approved = useMemo(() => templates.filter((t) => String(t.status || '').toUpperCase() === 'APPROVED'), [templates]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [variableMappings, setVariableMappings] = useState<Record<string, string>>({});
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');

  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sampleContacts, setSampleContacts] = useState<any[]>([]);
  const [noConsentCount, setNoConsentCount] = useState(0);
  const [sendConfirm, setSendConfirm] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const [whenMode, setWhenMode] = useState<'now' | 'later'>('now');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = approved.find((t) => t.id === selectedTemplateId);
  const info = templateInfo(selectedTemplate);

  useEffect(() => {
    if (approved.length > 0 && !selectedTemplateId) setSelectedTemplateId(approved[0].id);
  }, [approved, selectedTemplateId]);

  // Default each blank to a sensible detail when the message changes: first one is the first name.
  useEffect(() => {
    setVariableMappings((prev) => {
      const next: Record<string, string> = {};
      info.vars.forEach((v, i) => {
        next[v] = prev[v] ?? (i === 0 ? 'firstName' : i === 1 ? 'custom.company' : '');
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  const audienceFilter = {
    sendToAll,
    includeGroups: mode === 'groups' ? includeGroupIds : [],
    includeTags: mode === 'labels' ? includeTagIds : [],
    excludeGroups: excludeGroupIds,
    excludeTags: excludeTagIds,
  };
  const filterKey = JSON.stringify(audienceFilter);

  // Live audience calculation (same endpoint and body as before)
  useEffect(() => {
    setIsCalculating(true);
    fetch('/api/campaigns/calculate-audience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audienceFilter, templateId: selectedTemplateId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAudienceCount(data.count ?? 0);
        setSampleContacts(data.sampleContacts || []);
        setNoConsentCount(data.noConsentCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setIsCalculating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, selectedTemplateId]);

  const scheduledAt = whenMode === 'later' ? toScheduledIso(date, time) : null;
  const wizardState: WizardState = {
    name: campaignName,
    templateId: selectedTemplateId,
    requiredVars: info.vars,
    mappings: variableMappings,
    needsHeaderImage: info.needsHeaderImage,
    headerMediaUrl,
    sendToAll,
    includeCount: mode === 'labels' ? includeTagIds.length : mode === 'groups' ? includeGroupIds.length : 0,
    audienceCount,
    whenMode,
    scheduledAt,
    sendConfirm,
  };

  const goNext = () => {
    const problem = validateStep(step, wizardState);
    setError(problem);
    if (!problem && step < 4) setStep((step + 1) as 1 | 2 | 3 | 4);
  };
  const goBack = () => {
    setError(null);
    if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4);
  };

  const handleLaunchCampaign = async () => {
    const problem = validateStep(4, wizardState);
    if (problem) {
      setError(problem);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          templateId: selectedTemplateId,
          audienceFilter,
          variableMappings,
          headerMediaUrl,
          startImmediately: whenMode === 'now',
          ...(scheduledAt ? { scheduledAt } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Could not save this broadcast.');
      router.push(`/campaigns/${data.campaign.id}`);
    } catch (err: any) {
      setError(err?.message || 'Could not save this broadcast. Please try again.');
      setIsSubmitting(false);
    }
  };

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const sampleVars: Record<string, string> = {};
  info.vars.forEach((v) => {
    const m = variableMappings[v] || '';
    sampleVars[v] = SAMPLE_FOR[m] ?? (m.trim() || 'Sample');
  });

  const bigAudience = (audienceCount ?? 0) > BIG_AUDIENCE;
  const draftOnly = dispatchOn === false;
  const launchDisabled = isSubmitting || (audienceCount ?? 0) === 0 || (bigAudience && sendConfirm.trim() !== 'SEND');

  const preview = selectedTemplate && (
    <WhatsAppMockupPreview
      templateName={selectedTemplate.name}
      category={selectedTemplate.category}
      components={selectedTemplate.components}
      headerMediaUrl={headerMediaUrl}
      sampleVariables={sampleVars}
    />
  );

  const listChips = (items: any[], ids: string[], setIds: (v: string[]) => void, empty: string) =>
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground">{empty}</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Chip key={it.id} selected={ids.includes(it.id)} onClick={() => toggle(ids, setIds, it.id)}>
            {it.name}
          </Chip>
        ))}
      </div>
    );

  return (
    <div className="max-w-4xl space-y-4">
      {/* Compact step indicator */}
      <ol className="flex items-center gap-1" aria-label="Steps">
        {STEPS.map((s) => {
          const done = step > s.num;
          const current = step === s.num;
          return (
            <li key={s.num} className="flex min-w-0 flex-1 items-center gap-2" aria-current={current ? 'step' : undefined}>
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  current ? 'bg-primary text-primary-foreground' : done ? 'bg-success-subtle text-success-subtle-foreground' : 'bg-raised text-muted-foreground'
                }`}
              >
                {done ? <Check className="size-4" aria-hidden /> : s.num}
              </span>
              <span className={`truncate text-sm ${current ? 'font-semibold text-foreground' : 'text-muted-foreground'} ${current ? '' : 'hidden sm:inline'}`}>
                {s.title}
              </span>
              {s.num < 4 && <span className="h-px flex-1 bg-border" aria-hidden />}
            </li>
          );
        })}
      </ol>

      <div>
        <h2 className="text-lg font-semibold text-foreground">{STEPS[step - 1].title}</h2>
        <p className="text-sm text-muted-foreground">{STEPS[step - 1].help}</p>
      </div>

      {error && (
        <Alert tone="danger" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* STEP 1: Name */}
      {step === 1 && (
        <Card className="space-y-2 p-4 sm:p-5">
          <label htmlFor="broadcast-name" className="text-sm font-semibold text-foreground">
            Broadcast name
          </label>
          <input
            id="broadcast-name"
            type="text"
            placeholder="For example: Eid offer for regular customers"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className={FIELD_CLASS}
          />
        </Card>
      )}

      {/* STEP 2: Message */}
      {step === 2 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            {approved.length === 0 ? (
              <Alert tone="warning" title="No approved messages yet">
                Only messages approved by WhatsApp can be sent to many people. Create one under Templates and come back when it is approved.
              </Alert>
            ) : (
              <div className="space-y-2" role="radiogroup" aria-label="Approved messages">
                {approved.map((tpl) => {
                  const selected = selectedTemplateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`w-full rounded-2xl border-2 p-4 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
                        selected ? 'border-primary bg-card' : 'border-border bg-card hover:bg-accent'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-base font-semibold text-foreground">{String(tpl.name).replace(/_/g, ' ')}</span>
                        {selected && <Check className="size-5 shrink-0 text-primary" aria-hidden />}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{templateInfo(tpl).bodyText}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedTemplate && (
              <VariableMapper
                template={selectedTemplate}
                mappings={variableMappings}
                headerMediaUrl={headerMediaUrl}
                onChangeMapping={(k, v) => setVariableMappings({ ...variableMappings, [k]: v })}
                onChangeHeaderUrl={setHeaderMediaUrl}
              />
            )}
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-muted p-4 lg:col-span-5">
            <p className="mb-3 self-start text-sm font-semibold text-foreground">How it will look</p>
            {preview}
          </div>
        </div>
      )}

      {/* STEP 3: Audience */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Who gets it">
            <Chip selected={mode === 'all'} onClick={() => setMode('all')}>Everyone</Chip>
            <Chip selected={mode === 'labels'} onClick={() => setMode('labels')}>By label</Chip>
            <Chip selected={mode === 'groups'} onClick={() => setMode('groups')}>By group</Chip>
          </div>

          {mode === 'all' && <p className="text-sm text-muted-foreground">Everyone in your contacts who can be messaged.</p>}
          {mode === 'labels' && (
            <Card className="space-y-2 p-4">
              <p className="text-sm font-semibold text-foreground">People with any of these labels</p>
              {listChips(tags, includeTagIds, setIncludeTagIds, 'You have not made any labels yet.')}
            </Card>
          )}
          {mode === 'groups' && (
            <Card className="space-y-2 p-4">
              <p className="text-sm font-semibold text-foreground">People in any of these groups</p>
              {listChips(groups, includeGroupIds, setIncludeGroupIds, 'You have not made any groups yet.')}
            </Card>
          )}

          {(groups.length > 0 || tags.length > 0) && (
            <Card className="space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Leave out</p>
                <p className="text-sm text-muted-foreground">These people will not get it, even if they match above.</p>
              </div>
              {tags.length > 0 && listChips(tags, excludeTagIds, setExcludeTagIds, '')}
              {groups.length > 0 && listChips(groups, excludeGroupIds, setExcludeGroupIds, '')}
            </Card>
          )}

          <Card className="flex items-center justify-between gap-3 p-4">
            <span className="text-sm text-muted-foreground">Will receive this</span>
            <span className="text-2xl font-semibold tabular-nums text-foreground" aria-live="polite">
              {isCalculating ? '...' : audienceCount ?? 0}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">{audienceCount === 1 ? 'person' : 'people'}</span>
            </span>
          </Card>

          {noConsentCount > 0 && (
            <Alert tone="warning" title={`${noConsentCount} ${noConsentCount === 1 ? 'person has' : 'people have'} not agreed to get WhatsApp messages`}>
              Only send to people who have said yes. Sending to people who did not can get your number restricted.
            </Alert>
          )}
        </div>
      )}

      {/* STEP 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <Card className="space-y-3 p-4 sm:p-5">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="truncate font-semibold text-foreground">{campaignName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Message</dt>
                <dd className="truncate font-semibold text-foreground">{String(selectedTemplate?.name || '').replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Will receive this</dt>
                <dd className="font-semibold text-foreground">
                  {audienceCount ?? 0} {audienceCount === 1 ? 'person' : 'people'}
                </dd>
              </div>
            </dl>
            {sampleContacts.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="text-sm text-muted-foreground">A few of them</p>
                <ul className="mt-1 space-y-0.5 text-sm text-foreground">
                  {sampleContacts.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      {c.name} <span className="text-muted-foreground">{maskPhone(c.phone)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {noConsentCount > 0 && (
            <Alert tone="warning" title={`${noConsentCount} ${noConsentCount === 1 ? 'person has' : 'people have'} not agreed to get WhatsApp messages`}>
              Only send to people who have said yes. Sending to people who did not can get your number restricted.
            </Alert>
          )}

          <Card className="space-y-3 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">When to send</p>
            <div className="flex gap-2" role="group" aria-label="When to send">
              <Chip selected={whenMode === 'now'} onClick={() => setWhenMode('now')}>Now</Chip>
              <Chip selected={whenMode === 'later'} onClick={() => setWhenMode('later')}>Schedule</Chip>
            </div>
            {whenMode === 'later' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="send-date" className="text-sm text-muted-foreground">Date</label>
                  <input id="send-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_CLASS} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="send-time" className="text-sm text-muted-foreground">Time</label>
                  <input id="send-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD_CLASS} />
                </div>
              </div>
            )}
          </Card>

          {bigAudience && (
            <div className="space-y-1">
              <label htmlFor="send-confirm" className="text-sm font-semibold text-foreground">
                This is a large audience. Type SEND to confirm.
              </label>
              <input
                id="send-confirm"
                value={sendConfirm}
                onChange={(e) => setSendConfirm(e.target.value)}
                autoComplete="off"
                className={`${FIELD_CLASS} max-w-xs`}
              />
            </div>
          )}

          {draftOnly && (
            <Alert tone="warning" title="Sending is switched off">
              This will be saved as a draft and <strong>nothing will be sent</strong>. Ask your administrator when sending will be turned back on.
            </Alert>
          )}
        </div>
      )}

      {/* Action bar: sticky above the phone tab bar, normal row on wide screens */}
      <div className="sticky bottom-16 z-30 -mx-3.5 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-3.5 py-3 backdrop-blur sm:-mx-5 sm:px-5 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <Button variant="outline" size="lg" onClick={goBack} disabled={step === 1 || isSubmitting}>
          <ArrowLeft />
          Back
        </Button>
        {step < 4 ? (
          <Button size="lg" onClick={goNext}>
            Next
            <ArrowRight />
          </Button>
        ) : (
          <Button size="lg" variant={draftOnly ? 'outline' : 'wa'} onClick={handleLaunchCampaign} disabled={launchDisabled}>
            <Send />
            {draftOnly
              ? isSubmitting ? 'Saving...' : 'Save as draft (not sent)'
              : whenMode === 'later'
              ? isSubmitting ? 'Scheduling...' : 'Schedule broadcast'
              : isSubmitting ? 'Sending...' : 'Send broadcast'}
          </Button>
        )}
      </div>
    </div>
  );
}
