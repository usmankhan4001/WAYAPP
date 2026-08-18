'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Pause,
  MessageSquare,
  Tag,
  Users,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRules: 0, activeRules: 0, totalExecutions: 0 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMatchType, setFormMatchType] = useState<'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'ANY_INBOUND'>('CONTAINS');
  const [formKeywords, setFormKeywords] = useState('price, pricing, cost, quote');
  const [formActionType, setFormActionType] = useState<'SEND_TEXT' | 'SEND_TEMPLATE' | 'ADD_TAG' | 'ASSIGN_GROUP'>('SEND_TEXT');
  const [formActionText, setFormActionText] = useState('Hi! Thank you for your interest. Here is our pricing list: https://gccstartup.com/pricing');
  const [formTemplateName, setFormTemplateName] = useState('');
  const [formTagName, setFormTagName] = useState('Pricing Inquiry');
  const [formGroupId, setFormGroupId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/automations');
      const data = await res.json();
      setAutomations(data.automations || []);
      setStats(data.stats || { totalRules: 0, activeRules: 0, totalExecutions: 0 });
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();

    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(() => {});

    fetch('/api/groups')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setGroups(data);
      })
      .catch(() => {});
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchAutomations();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      fetchAutomations();
    } catch {}
  };

  const handleOpenCreate = (recipe?: any) => {
    setEditingId(null);
    if (recipe) {
      setFormName(recipe.name);
      setFormDesc(recipe.desc);
      setFormMatchType(recipe.matchType);
      setFormKeywords(recipe.keywords);
      setFormActionType(recipe.actionType);
      setFormActionText(recipe.actionText || '');
      setFormTagName(recipe.tagName || '');
    } else {
      setFormName('');
      setFormDesc('');
      setFormMatchType('CONTAINS');
      setFormKeywords('price, cost, demo');
      setFormActionType('SEND_TEXT');
      setFormActionText('Hi! Thanks for messaging us. How can we assist you today?');
      setFormTagName('Hot Lead');
    }
    setIsModalOpen(true);
  };

  const handleSaveAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSaving(true);
    const keywordsArray = formKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const triggerConfig = {
      matchType: formMatchType,
      keywords: keywordsArray,
    };

    const actionsJson = [
      {
        type: formActionType,
        payload: {
          text: formActionType === 'SEND_TEXT' ? formActionText : undefined,
          templateName: formActionType === 'SEND_TEMPLATE' ? formTemplateName : undefined,
          tagName: formActionType === 'ADD_TAG' ? formTagName : undefined,
          groupId: formActionType === 'ASSIGN_GROUP' ? formGroupId : undefined,
        },
      },
    ];

    try {
      if (editingId) {
        await fetch(`/api/automations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            description: formDesc,
            triggerType: 'KEYWORD_MATCH',
            triggerConfig,
            actionsJson,
          }),
        });
      } else {
        await fetch('/api/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            description: formDesc,
            triggerType: 'KEYWORD_MATCH',
            triggerConfig,
            actionsJson,
            isActive: true,
          }),
        });
      }

      setIsModalOpen(false);
      fetchAutomations();
    } catch {} finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">WhatsApp Workflow Automations</h1>
            <InfoTooltip content="Set up intelligent keyword auto-responders, lead tagging, and automated reply sequences that fire 24/7 on customer WhatsApp messages." />
          </div>
          <p className="text-xs text-slate-500">
            Intelligent keyword auto-responders, customer reply handlers, and instant lead tagging
          </p>
        </div>

        <button
          onClick={() => handleOpenCreate()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Automation</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Auto-Responders</span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{stats.activeRules}</p>
          <p className="text-[11px] text-emerald-700 font-medium">{stats.totalRules} total rules configured</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Automated Replies Dispatched</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700 font-mono">{stats.totalExecutions.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500">Instant responses triggered without agent delay</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Automation Health</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">100%</p>
          <p className="text-[11px] text-emerald-700 font-medium">Meta Webhook Listener Connected</p>
        </div>
      </div>

      {/* Pre-Built Recipes Starter Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Quick-Start Automation Recipes
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() =>
              handleOpenCreate({
                name: 'Instant Price List Auto-Responder',
                desc: 'Sends our official pricing sheet whenever a customer asks about price or cost',
                matchType: 'CONTAINS',
                keywords: 'price, pricing, cost, rate, quote, fees',
                actionType: 'SEND_TEXT',
                actionText:
                  'Hello! Here is our official pricing overview: https://gccstartup.com/pricing. Reply with 1 to speak with an advisor.',
              })
            }
            className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition-all group"
          >
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-400">
              🏷️ Price & Quote Auto-Reply
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">Triggers when message has &ldquo;price&rdquo; or &ldquo;quote&rdquo;.</p>
          </button>

          <button
            onClick={() =>
              handleOpenCreate({
                name: 'Welcome New Inbound Leads',
                desc: 'Sends warm greeting and company overview on any first inbound message',
                matchType: 'ANY_INBOUND',
                keywords: '',
                actionType: 'SEND_TEXT',
                actionText:
                  'Welcome to WAYAPP & GCC Startup! How can our support team assist you today?',
              })
            }
            className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition-all group"
          >
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-400">
              👋 24/7 Welcome Auto-Responder
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">Greets every new inbound customer instantly.</p>
          </button>

          <button
            onClick={() =>
              handleOpenCreate({
                name: 'Auto-Tag High-Value VIP Leads',
                desc: 'Automatically tags customers inquiring about VIP enterprise packages',
                matchType: 'CONTAINS',
                keywords: 'vip, enterprise, custom, bulk, corporate',
                actionType: 'ADD_TAG',
                tagName: 'VIP Corporate Lead',
              })
            }
            className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition-all group"
          >
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-400">
              ⭐ VIP Lead Auto-Tagger
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">Tags contacts as &ldquo;VIP Corporate Lead&rdquo; automatically.</p>
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Configured Automation Rules</h3>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : automations.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Zap className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Automation Rules Configured</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create an auto-responder or click one of the quick recipes above to automate WhatsApp responses.
            </p>
            <button
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Rule</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((rule) => {
              let triggerConfig: any = {};
              let actions: any[] = [];
              try {
                triggerConfig = JSON.parse(rule.triggerConfig);
                actions = JSON.parse(rule.actionsJson);
              } catch {}

              const action = actions[0] || {};

              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-2xl border-2 transition-all bg-white space-y-3 ${
                    rule.isActive ? 'border-slate-200 hover:border-emerald-500' : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{rule.name}</h4>
                      {rule.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{rule.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(rule.id, rule.isActive)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          rule.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                        title={rule.isActive ? 'Disable Rule' : 'Enable Rule'}
                      >
                        {rule.isActive ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Trigger Details */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>When Customer Message</span>
                      <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                        {triggerConfig.matchType}
                      </span>
                    </div>

                    {triggerConfig.matchType !== 'ANY_INBOUND' && (
                      <div className="flex flex-wrap gap-1">
                        {(triggerConfig.keywords || []).map((kw: string, i: number) => (
                          <span
                            key={i}
                            className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px] font-mono text-slate-700 font-semibold"
                          >
                            &ldquo;{kw}&rdquo;
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Details */}
                  <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1 text-xs">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      <span>Then Execute Action</span>
                    </div>
                    {action.type === 'SEND_TEXT' && (
                      <p className="text-[11px] text-slate-700 italic line-clamp-2">
                        💬 Auto-reply: &ldquo;{action.payload?.text}&rdquo;
                      </p>
                    )}
                    {action.type === 'SEND_TEMPLATE' && (
                      <p className="text-[11px] text-slate-700 font-mono">
                        📋 Send Approved Template: &ldquo;{action.payload?.templateName}&rdquo;
                      </p>
                    )}
                    {action.type === 'ADD_TAG' && (
                      <p className="text-[11px] text-emerald-800 font-semibold">
                        🏷️ Add Tag: &ldquo;{action.payload?.tagName}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>Dispatched: <strong className="text-slate-700">{rule.executionCount} times</strong></span>
                    {rule.lastTriggeredAt && (
                      <span>Last fired: {new Date(rule.lastTriggeredAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Automation Rule' : 'Create New Automation Rule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAutomation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Pricing Auto-Responder"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-base text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Automatically replies when price is mentioned"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="input-base text-xs"
                />
              </div>

              {/* Trigger Condition */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  1. When Customer Sends a WhatsApp Message
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Matching Rule</label>
                  <select
                    value={formMatchType}
                    onChange={(e) => setFormMatchType(e.target.value as any)}
                    className="input-base text-xs font-medium"
                  >
                    <option value="CONTAINS">Message Contains Any Keyword</option>
                    <option value="EXACT">Message Is Exact Word Match</option>
                    <option value="STARTS_WITH">Message Starts With Keyword</option>
                    <option value="ANY_INBOUND">Any Incoming Message (Welcome Sequence)</option>
                  </select>
                </div>

                {formMatchType !== 'ANY_INBOUND' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Keywords (Comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. price, pricing, cost, rate"
                      value={formKeywords}
                      onChange={(e) => setFormKeywords(e.target.value)}
                      className="input-base text-xs font-mono"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Action Response */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  2. Automatically Do This
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Action Type</label>
                  <select
                    value={formActionType}
                    onChange={(e) => setFormActionType(e.target.value as any)}
                    className="input-base text-xs font-medium"
                  >
                    <option value="SEND_TEXT">Send WhatsApp Text Message</option>
                    <option value="SEND_TEMPLATE">Send Pre-Approved WhatsApp Template</option>
                    <option value="ADD_TAG">Add Tag to Customer (e.g. Hot Lead)</option>
                  </select>
                </div>

                {formActionType === 'SEND_TEXT' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Auto-Reply Text</label>
                    <textarea
                      rows={3}
                      value={formActionText}
                      onChange={(e) => setFormActionText(e.target.value)}
                      placeholder="Type the message that will be sent to the customer..."
                      className="input-base text-xs resize-none"
                      required
                    />
                  </div>
                )}

                {formActionType === 'SEND_TEMPLATE' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Template</label>
                    <select
                      value={formTemplateName}
                      onChange={(e) => setFormTemplateName(e.target.value)}
                      className="input-base text-xs font-medium font-mono"
                      required
                    >
                      <option value="">Select a template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formActionType === 'ADD_TAG' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tag Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Hot Lead"
                      value={formTagName}
                      onChange={(e) => setFormTagName(e.target.value)}
                      className="input-base text-xs"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary text-xs"
                >
                  {isSaving ? 'Saving...' : 'Save Automation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
