'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Users,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Filter,
  Eye,
  Clock,
} from 'lucide-react';
import { WhatsAppMockupPreview } from '../templates/WhatsAppMockupPreview';
import { VariableMapper } from './VariableMapper';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';

interface CampaignWizardProps {
  templates: any[];
  groups: any[];
  tags: any[];
}

export function CampaignWizard({ templates = [], groups = [], tags = [] }: CampaignWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [includeGroupIds, setIncludeGroupIds] = useState<string[]>([]);
  const [includeTagIds, setIncludeTagIds] = useState<string[]>([]);
  const [excludeGroupIds, setExcludeGroupIds] = useState<string[]>([]);
  const [excludeTagIds, setExcludeTagIds] = useState<string[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [variableMappings, setVariableMappings] = useState<Record<string, string>>({
    '1': 'firstName',
    '2': 'custom.company',
  });
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');

  // Audience Live Calculator State
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sampleContacts, setSampleContacts] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  // Live audience calculation trigger
  useEffect(() => {
    setIsCalculating(true);
    const audienceFilter = {
      sendToAll,
      includeGroups: includeGroupIds,
      includeTags: includeTagIds,
      excludeGroups: excludeGroupIds,
      excludeTags: excludeTagIds,
    };

    fetch('/api/campaigns/calculate-audience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audienceFilter }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAudienceCount(data.count ?? 0);
        setSampleContacts(data.sampleContacts || []);
      })
      .catch(() => {})
      .finally(() => setIsCalculating(false));
  }, [sendToAll, includeGroupIds, includeTagIds, excludeGroupIds, excludeTagIds]);

  const handleLaunchCampaign = async () => {
    if (!campaignName.trim()) {
      setError('Please provide a campaign name.');
      setStep(1);
      return;
    }
    if (!selectedTemplateId) {
      setError('Please select a message template.');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const audienceFilter = {
        sendToAll,
        includeGroups: includeGroupIds,
        includeTags: includeTagIds,
        excludeGroups: excludeGroupIds,
        excludeTags: excludeTagIds,
      };

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          templateId: selectedTemplateId,
          audienceFilter,
          variableMappings,
          headerMediaUrl,
          startImmediately: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to launch campaign');
      }

      router.push(`/campaigns/${data.campaign.id}`);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Wizard Step Progress Tracker */}
      <div className="bg-card p-3 rounded-2xl border border-border shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, title: 'Audience & Target', icon: Users, tooltip: 'Define audience by selecting groups, tags, and exclusions' },
            { num: 2, title: 'Select Template', icon: FileText, tooltip: 'Choose approved Meta WhatsApp template' },
            { num: 3, title: 'Map Variables', icon: Sliders, tooltip: 'Map dynamic placeholders like {{1}} to contact fields' },
            { num: 4, title: 'Review & Launch', icon: Send, tooltip: 'Pre-flight check and rate-limited dispatch' },
          ].map((s) => {
            const Icon = s.icon;
            const isDone = step > s.num;
            const isCurrent = step === s.num;

            return (
              <Tooltip key={s.num} content={s.tooltip} className="w-full">
                <button
                  type="button"
                  onClick={() => setStep(s.num as any)}
                  className={`w-full p-2.5 rounded-xl flex items-center gap-2.5 text-left transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : isDone
                      ? 'bg-muted text-foreground hover:bg-accent'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isDone
                        ? 'bg-brand-subtle text-brand-subtle-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p className="text-xs truncate">{s.title}</p>
                  </div>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Campaign Details & Audience Categorization */}
      {step === 1 && (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Campaign Details & Audience Targeting</h3>
            <p className="text-xs text-muted-foreground">
              Define your broadcast name and select which groups and tags to include or exclude.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-bold text-foreground">
                Campaign Name <span className="text-destructive">*</span>
              </label>
              <InfoTooltip content="Internal identifier for this broadcast campaign (e.g. 'October VIP Discount Promo')." />
            </div>
            <input
              type="text"
              required
              placeholder="e.g. VIP Seasonal Announcement"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-input outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Audience Filter Settings */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span>Target Audience Criteria</span>
                </span>
                <InfoTooltip content="Include multiple lists with OR logic, or broadcast to all active contacts while subtracting excluded groups." />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  className="rounded text-primary focus:ring-ring w-4 h-4"
                />
                <span>Broadcast to ALL Active Contacts</span>
              </label>
            </div>

            {!sendToAll && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Include Groups & Tags */}
                <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-foreground">Include Groups & Tags (OR)</span>
                      <InfoTooltip content="Contacts belonging to ANY of these selected groups or tags will receive the broadcast." />
                    </div>
                    <span className="text-[0.625rem] font-semibold bg-brand-subtle text-brand-subtle-foreground px-2 py-0.5 rounded">
                      Target Lists
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Include Groups</label>
                    <div className="flex flex-wrap gap-1.5">
                      {groups.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No groups created yet</span>
                      ) : (
                        groups.map((g) => {
                          const isSelected = includeGroupIds.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) setIncludeGroupIds(includeGroupIds.filter((id) => id !== g.id));
                                else setIncludeGroupIds([...includeGroupIds, g.id]);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-card text-foreground border border-input hover:bg-accent'
                              }`}
                            >
                              + {g.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Include Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No tags created yet</span>
                      ) : (
                        tags.map((t) => {
                          const isSelected = includeTagIds.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) setIncludeTagIds(includeTagIds.filter((id) => id !== t.id));
                                else setIncludeTagIds([...includeTagIds, t.id]);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-card text-foreground border border-input hover:bg-accent'
                              }`}
                            >
                              {t.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Exclude Groups & Tags */}
                <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-foreground">Exclude Lists (Subtract)</span>
                      <InfoTooltip content="Contacts in these excluded lists will NEVER receive this broadcast, even if they matched inclusion rules." />
                    </div>
                    <span className="text-[10px] text-destructive font-semibold bg-destructive/10 px-2 py-0.5 rounded border border-destructive/30">
                      Suppression
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Exclude Groups</label>
                    <div className="flex flex-wrap gap-1.5">
                      {groups.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No groups</span>
                      ) : (
                        groups.map((g) => {
                          const isSelected = excludeGroupIds.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) setExcludeGroupIds(excludeGroupIds.filter((id) => id !== g.id));
                                else setExcludeGroupIds([...excludeGroupIds, g.id]);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-destructive text-white shadow-sm'
                                  : 'bg-card text-foreground border border-input hover:bg-destructive/10'
                              }`}
                            >
                              - {g.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Exclude Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No tags</span>
                      ) : (
                        tags.map((t) => {
                          const isSelected = excludeTagIds.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) setExcludeTagIds(excludeTagIds.filter((id) => id !== t.id));
                                else setExcludeTagIds([...excludeTagIds, t.id]);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-destructive text-white shadow-sm'
                                  : 'bg-card text-foreground border border-input hover:bg-destructive/10'
                              }`}
                            >
                              - {t.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Deduplicated Audience Counter */}
            <div className="p-4 rounded-xl bg-primary text-primary-foreground flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Deduplicated Audience
                    </span>
                    <InfoTooltip content="Calculates unique matching contacts, automatically removing duplicate phone numbers and suppressed recipients." />
                  </div>
                  <p className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{isCalculating ? 'Calculating...' : `${audienceCount ?? 0} Contacts`}</span>
                    <span className="text-xs font-normal text-primary">Active & E.164 Valid</span>
                  </p>
                </div>
              </div>

              {sampleContacts.length > 0 && (
                <div className="hidden sm:block text-right">
                  <p className="text-[11px] text-muted-foreground">Sample Recipients:</p>
                  <p className="text-xs text-muted-foreground font-medium font-mono">
                    {sampleContacts.map((c) => c.name || c.phone).slice(0, 2).join(', ')}...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={() => {
                if (!campaignName.trim()) {
                  setError('Please provide a campaign name.');
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>Next: Select Template</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Meta Template */}
      {step === 2 && (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-foreground">Choose Message Template</h3>
              <InfoTooltip content="Templates must be approved by Meta before they can be broadcast to customers." />
            </div>
            <p className="text-xs text-muted-foreground">
              Select an approved Meta WhatsApp template to broadcast to your audience.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Template Selection List */}
            <div className="lg:col-span-7 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {templates.length === 0 ? (
                <div className="p-8 text-center bg-muted rounded-xl border border-border space-y-2">
                  <p className="text-xs font-bold text-foreground">No Templates Found</p>
                  <p className="text-[11px] text-muted-foreground">
                    You need at least one approved template. Go to the Templates tab to create or sync.
                  </p>
                </div>
              ) : (
                templates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  let components: any[] = [];
                  try {
                    components = typeof tpl.components === 'string' ? JSON.parse(tpl.components) : tpl.components;
                  } catch {}

                  const bodyText = components.find((c) => c.type === 'BODY')?.text || '';

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-brand-subtle/50 shadow-sm'
                          : 'border-border hover:border-input bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-primary bg-primary' : 'border-input'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 bg-card rounded-full" />}
                          </span>
                          <h4 className="text-xs font-bold text-foreground font-mono">{tpl.name}</h4>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-subtle text-brand-subtle-foreground font-bold">
                          {tpl.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{bodyText}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground font-semibold uppercase">
                        <span>Category: {tpl.category}</span>
                        <span>•</span>
                        <span>Lang: {tpl.language}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Live Mockup */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-muted rounded-2xl border border-border">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                Selected Template Preview
              </h4>
              {selectedTemplate && (
                <WhatsAppMockupPreview
                  templateName={selectedTemplate.name}
                  category={selectedTemplate.category}
                  components={selectedTemplate.components}
                  headerMediaUrl={headerMediaUrl}
                  sampleVariables={{ '1': 'Customer', '2': 'Company', '3': 'PROMO' }}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-accent flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedTemplateId}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>Next: Map Dynamic Variables</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Map Dynamic Variables */}
      {step === 3 && (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-foreground">Map Dynamic Contact Variables</h3>
              <InfoTooltip content="Each {{1}}, {{2}} placeholder in your template will be replaced dynamically with the corresponding contact field." />
            </div>
            <p className="text-xs text-muted-foreground">
              Personalize each outgoing message for every recipient in your audience.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <VariableMapper
                template={selectedTemplate}
                mappings={variableMappings}
                headerMediaUrl={headerMediaUrl}
                onChangeMapping={(k, v) => setVariableMappings({ ...variableMappings, [k]: v })}
                onChangeHeaderUrl={(url) => setHeaderMediaUrl(url)}
              />
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-muted rounded-2xl border border-border">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                Personalized Preview
              </h4>
              {selectedTemplate && (
                <WhatsAppMockupPreview
                  templateName={selectedTemplate.name}
                  category={selectedTemplate.category}
                  components={selectedTemplate.components}
                  headerMediaUrl={headerMediaUrl}
                  sampleVariables={{ '1': 'Rashid', '2': 'Apex Enterprise', '3': 'PROMO' }}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-accent flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <span>Next: Review & Launch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Pre-Flight Check */}
      {step === 4 && (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Pre-Flight Review & Launch Broadcast</h3>
            <p className="text-xs text-muted-foreground">
              Please review all parameters before dispatching your WhatsApp broadcast campaign.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-muted border border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Campaign</span>
              <p className="text-sm font-bold text-foreground mt-1 truncate">{campaignName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">Template: {selectedTemplate?.name}</p>
            </div>

            <div className="p-4 rounded-xl bg-muted border border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recipients</span>
              <p className="text-lg font-bold text-foreground mt-1">{audienceCount ?? 0} Contacts</p>
              <p className="text-xs text-muted-foreground mt-0.5">Deduplicated & Active</p>
            </div>

            <div className="p-4 rounded-xl bg-muted border border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Est. Duration</span>
              <p className="text-sm font-bold text-foreground mt-1">~ {Math.max(1, Math.ceil((audienceCount || 1) / 20))}s</p>
              <p className="text-xs text-muted-foreground mt-0.5">Rate: 20 msgs/sec</p>
            </div>

            <div className="p-4 rounded-xl bg-success-subtle border border-success/20">
              <span className="text-[10px] font-bold text-success-subtle-foreground uppercase tracking-wider">0% Markup Meta Cost</span>
              <p className="text-lg font-bold text-success-subtle-foreground mt-1 font-mono">
                ${((audienceCount || 0) * 0.045).toFixed(2)} USD
              </p>
              <p className="text-[10px] text-primary mt-0.5">Official Meta Rate (0% Surcharge)</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted border border-border text-xs text-foreground space-y-1">
            <p className="font-bold text-foreground">Compliance & Rate Limiting:</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Messages will be dispatched with asynchronous throttling (default: 20 messages/second) to stay within Meta WhatsApp messaging limits and protect your phone number quality rating.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-accent flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleLaunchCampaign}
              disabled={isSubmitting || (audienceCount ?? 0) === 0}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Starting Dispatch Engine...' : 'Launch WhatsApp Broadcast'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
