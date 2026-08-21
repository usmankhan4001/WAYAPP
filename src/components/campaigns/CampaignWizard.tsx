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
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
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
                      ? 'bg-slate-900 text-white font-bold shadow-sm'
                      : isDone
                      ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-500 text-white'
                        : isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-500'
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
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Campaign Details & Audience Categorization */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Campaign Details & Audience Targeting</h3>
            <p className="text-xs text-slate-500">
              Define your broadcast name and select which groups and tags to include or exclude.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-bold text-slate-700">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <InfoTooltip content="Internal identifier for this broadcast campaign (e.g. 'October VIP Discount Promo')." />
            </div>
            <input
              type="text"
              required
              placeholder="e.g. VIP Seasonal Announcement"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Audience Filter Settings */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Target Audience Criteria</span>
                </span>
                <InfoTooltip content="Include multiple lists with OR logic, or broadcast to all active contacts while subtracting excluded groups." />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Broadcast to ALL Active Contacts</span>
              </label>
            </div>

            {!sendToAll && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Include Groups & Tags */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-900">Include Groups & Tags (OR)</span>
                      <InfoTooltip content="Contacts belonging to ANY of these selected groups or tags will receive the broadcast." />
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Target Lists
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Include Groups</label>
                    <div className="flex flex-wrap gap-1.5">
                      {groups.length === 0 ? (
                        <span className="text-xs text-slate-400">No groups created yet</span>
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
                                  ? 'bg-slate-900 text-white shadow-sm'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
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
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Include Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.length === 0 ? (
                        <span className="text-xs text-slate-400">No tags created yet</span>
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
                                  ? 'bg-slate-900 text-white shadow-sm'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
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
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-900">Exclude Lists (Subtract)</span>
                      <InfoTooltip content="Contacts in these excluded lists will NEVER receive this broadcast, even if they matched inclusion rules." />
                    </div>
                    <span className="text-[10px] text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      Suppression
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Exclude Groups</label>
                    <div className="flex flex-wrap gap-1.5">
                      {groups.length === 0 ? (
                        <span className="text-xs text-slate-400">No groups</span>
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
                                  ? 'bg-red-700 text-white shadow-sm'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-red-50'
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
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Exclude Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.length === 0 ? (
                        <span className="text-xs text-slate-400">No tags</span>
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
                                  ? 'bg-red-700 text-white shadow-sm'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-red-50'
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
            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Deduplicated Audience
                    </span>
                    <InfoTooltip content="Calculates unique matching contacts, automatically removing duplicate phone numbers and suppressed recipients." />
                  </div>
                  <p className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{isCalculating ? 'Calculating...' : `${audienceCount ?? 0} Contacts`}</span>
                    <span className="text-xs font-normal text-emerald-400">Active & E.164 Valid</span>
                  </p>
                </div>
              </div>

              {sampleContacts.length > 0 && (
                <div className="hidden sm:block text-right">
                  <p className="text-[11px] text-slate-400">Sample Recipients:</p>
                  <p className="text-xs text-slate-200 font-medium font-mono">
                    {sampleContacts.map((c) => c.name || c.phone).slice(0, 2).join(', ')}...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Next Button */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => {
                if (!campaignName.trim()) {
                  setError('Please provide a campaign name.');
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <span>Next: Select Template</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Meta Template */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-slate-900">Choose Message Template</h3>
              <InfoTooltip content="Templates must be approved by Meta before they can be broadcast to customers." />
            </div>
            <p className="text-xs text-slate-500">
              Select an approved Meta WhatsApp template to broadcast to your audience.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Template Selection List */}
            <div className="lg:col-span-7 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {templates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-700">No Templates Found</p>
                  <p className="text-[11px] text-slate-500">
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
                          ? 'border-emerald-600 bg-emerald-50/30 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 font-mono">{tpl.name}</h4>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          {tpl.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{bodyText}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400 font-semibold uppercase">
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
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
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

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedTemplateId}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>Next: Map Dynamic Variables</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Map Dynamic Variables */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-slate-900">Map Dynamic Contact Variables</h3>
              <InfoTooltip content="Each {{1}}, {{2}} placeholder in your template will be replaced dynamically with the corresponding contact field." />
            </div>
            <p className="text-xs text-slate-500">
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

            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
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

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <span>Next: Review & Launch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Pre-Flight Check */}
      {step === 4 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Pre-Flight Review & Launch Broadcast</h3>
            <p className="text-xs text-slate-500">
              Please review all parameters before dispatching your WhatsApp broadcast campaign.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Campaign</span>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">{campaignName}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">Template: {selectedTemplate?.name}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recipients</span>
              <p className="text-lg font-bold text-slate-900 mt-1">{audienceCount ?? 0} Contacts</p>
              <p className="text-xs text-slate-500 mt-0.5">Deduplicated & Active</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Est. Duration</span>
              <p className="text-sm font-bold text-slate-900 mt-1">~ {Math.max(1, Math.ceil((audienceCount || 1) / 20))}s</p>
              <p className="text-xs text-slate-500 mt-0.5">Rate: 20 msgs/sec</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">0% Markup Meta Cost</span>
              <p className="text-lg font-bold text-emerald-900 mt-1 font-mono">
                ${((audienceCount || 0) * 0.045).toFixed(2)} USD
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Official Meta Rate (0% Surcharge)</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <p className="font-bold text-slate-900">Compliance & Rate Limiting:</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Messages will be dispatched with asynchronous throttling (default: 20 messages/second) to stay within Meta WhatsApp messaging limits and protect your phone number quality rating.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleLaunchCampaign}
              disabled={isSubmitting || (audienceCount ?? 0) === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
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
