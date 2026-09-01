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
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useConfirm } from '@/lib/hooks/use-confirm';

export default function AutomationsPage() {
  const confirm = useConfirm();
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
  const [formMatchType, setFormMatchType] = useState<'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'REGEX' | 'ANY_INBOUND'>('CONTAINS');
  const [formKeywords, setFormKeywords] = useState('price, pricing, cost, quote');
  const [formActionType, setFormActionType] = useState<'SEND_TEXT' | 'SEND_TEMPLATE' | 'ADD_TAG' | 'ASSIGN_GROUP'>('SEND_TEXT');
  const [formActionText, setFormActionText] = useState('Hi! Thank you for your interest. Here is our pricing list: https://example.com/pricing');
  const [formTemplateName, setFormTemplateName] = useState('');
  const [formTagName, setFormTagName] = useState('Pricing Inquiry');
  const [formGroupId, setFormGroupId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/automations');
      const data = await res.json();
      setAutomations(data.automations || []);
      setStats(data.stats || { totalRules: 0, activeRules: 0, totalExecutions: 0 });
    } catch (error) {
      console.warn('[Automations] Failed to fetch automations:', error);
    } finally {
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
      .catch((error) => console.warn('[Automations] Failed to fetch templates:', error));

    fetch('/api/groups')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setGroups(data);
      })
      .catch((error) => console.warn('[Automations] Failed to fetch groups:', error));
  }, []);

  // Show the pre-built recipes open by default only for brand-new setups with no rules yet
  useEffect(() => {
    if (!loading && automations.length === 0) {
      setShowRecipes(true);
    }
  }, [loading, automations.length]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchAutomations();
    } catch (error) {
      console.warn('[Automations] Failed to toggle rule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete this automation rule?', destructive: true, confirmLabel: 'Delete' }))) return;
    try {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      fetchAutomations();
    } catch (error) {
      console.warn('[Automations] Failed to delete rule:', error);
    }
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
      setFormGroupId(recipe.groupId || '');
    } else {
      setFormName('');
      setFormDesc('');
      setFormMatchType('CONTAINS');
      setFormKeywords('price, cost, demo');
      setFormActionType('SEND_TEXT');
      setFormActionText('Hi! Thanks for messaging us. How can we assist you today?');
      setFormTagName('Hot Lead');
      setFormGroupId('');
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
    } catch (error) {
      console.warn('[Automations] Failed to save rule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-foreground tracking-tight">WhatsApp Workflow Automations</h1>
            <InfoTooltip content="Set up intelligent keyword auto-responders, lead tagging, and automated reply sequences that fire 24/7 on customer WhatsApp messages." />
          </div>
          <p className="text-xs text-muted-foreground">
            Intelligent keyword auto-responders, customer reply handlers, and instant lead tagging
          </p>
        </div>

        <button
          onClick={() => handleOpenCreate()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Automation</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Active Auto-Responders</span>
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.activeRules}</p>
          <p className="text-[11px] text-primary font-medium">{stats.totalRules} total rules configured</p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Automated Replies Dispatched</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700 font-mono">{stats.totalExecutions.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">Instant responses triggered without agent delay</p>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Automation Health</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">100%</p>
          <p className="text-[11px] text-primary font-medium">Meta Webhook Listener Connected</p>
        </div>
      </div>

      {/* Pre-Built Industry Recipes Starter Banner (collapsed by default once rules exist, to reduce clutter) */}
      <div className="bg-foreground bg-linear-to-r from-transparent to-foreground/90 text-primary-foreground rounded-2xl p-5 shadow-sm space-y-3">
        <button
          type="button"
          onClick={() => setShowRecipes((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              1-Click Pre-Built Industry Sales Recipes
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="text-[10px]">{showRecipes ? 'Hide' : 'Show'} recipes</span>
            {showRecipes ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        </button>
        {showRecipes && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            onClick={() =>
              handleOpenCreate({
                name: '🏢 Real Estate Viewing Scheduler',
                desc: 'Captures property inquiries, shares brochure, and schedules site visits',
                matchType: 'CONTAINS',
                keywords: 'property, villa, apartment, rent, buy, viewing',
                actionType: 'SEND_TEXT',
                actionText:
                  'Hello! Thank you for inquiring about our luxury properties. 🏢 You can view our available listings and brochure here: https://example.com/properties.pdf. Would you like to schedule a private site viewing this week?',
                tagName: 'Real Estate Lead',
              })
            }
            className="p-3 bg-background/10 hover:bg-background/15 border border-background/15 hover:border-primary rounded-xl text-left transition-all group shadow-2xs"
          >
            <h4 className="text-xs font-bold text-white group-hover:text-primary truncate">
              🏢 Real Estate
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">Site viewing and brochure dispatch</p>
          </button>

          <button
            onClick={() =>
              handleOpenCreate({
                name: '🛍️ E-Commerce Cart & COD Recovery',
                desc: 'Re-engages abandoned carts and confirms Cash on Delivery orders',
                matchType: 'CONTAINS',
                keywords: 'cart, order, cod, checkout, delivery',
                actionType: 'SEND_TEXT',
                actionText:
                  'Hi there! 🛍️ We noticed you left items in your cart. Complete your order in the next 2 hours with coupon SAVE10 for an extra 10% discount: https://example.com/checkout',
                tagName: 'E-Commerce Cart Lead',
              })
            }
            className="p-3 bg-background/10 hover:bg-background/15 border border-background/15 hover:border-primary rounded-xl text-left transition-all group shadow-2xs"
          >
            <h4 className="text-xs font-bold text-white group-hover:text-primary truncate">
              🛍️ E-Commerce
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">Abandoned cart recovery & COD</p>
          </button>

          <button
            onClick={() =>
              handleOpenCreate({
                name: '🚗 Automotive Test Drive Booking',
                desc: 'Qualifies vehicle interest and books showroom test drives',
                matchType: 'CONTAINS',
                keywords: 'test drive, car, showroom, suv, sedan, service',
                actionType: 'SEND_TEXT',
                actionText:
                  'Hello! 🚗 Thank you for your interest in our latest vehicle models. Which model would you like to experience? Reply with 1 for SUV, 2 for Sedan, or 3 to speak with a showroom specialist.',
                tagName: 'Auto Test Drive Lead',
              })
            }
            className="p-3 bg-background/10 hover:bg-background/15 border border-background/15 hover:border-primary rounded-xl text-left transition-all group shadow-2xs"
          >
            <h4 className="text-xs font-bold text-white group-hover:text-primary truncate">
              🚗 Automotive
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">Test drive and showroom booking</p>
          </button>

          <button
            onClick={() =>
              handleOpenCreate({
                name: '🏥 Clinic Appointment Booking',
                desc: 'Assists patients with doctor consultation scheduling and clinic timings',
                matchType: 'CONTAINS',
                keywords: 'doctor, appointment, clinic, consultation, dentist',
                actionType: 'SEND_TEXT',
                actionText:
                  'Welcome to our medical center! 🏥 Our clinic hours are Mon–Sat 9AM–8PM. To book a consultation with our specialist, please reply with your preferred date and time.',
                tagName: 'Patient Appointment Lead',
              })
            }
            className="p-3 bg-background/10 hover:bg-background/15 border border-background/15 hover:border-primary rounded-xl text-left transition-all group shadow-2xs"
          >
            <h4 className="text-xs font-bold text-white group-hover:text-primary truncate">
              🏥 Clinic & Health
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">Doctor consultation & reminder</p>
          </button>

          <button
            onClick={() =>
              handleOpenCreate({
                name: '💼 B2B Lead Gen & Demo Booking',
                desc: 'Captures business inquiries and books consultation call',
                matchType: 'CONTAINS',
                keywords: 'price, pricing, cost, quote, enterprise, demo',
                actionType: 'SEND_TEXT',
                actionText:
                  'Hello! 💼 Thank you for your inquiry. Our enterprise packages start at $29/mo with 0% markup. You can book a 1-on-1 walkthrough here: https://calendly.com/your-company/demo',
                tagName: 'B2B Qualified Lead',
              })
            }
            className="p-3 bg-background/10 hover:bg-background/15 border border-background/15 hover:border-primary rounded-xl text-left transition-all group shadow-2xs"
          >
            <h4 className="text-xs font-bold text-white group-hover:text-primary truncate">
              💼 B2B Lead Gen
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">Price quote & Calendly demo</p>
          </button>
        </div>
        )}
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Configured Automation Rules</h3>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-2xl border-2 border-border bg-card space-y-3">
                <Skeleton width={160} height={14} />
                <Skeleton variant="rounded" height={48} />
                <Skeleton variant="rounded" height={36} />
              </div>
            ))}
          </div>
        ) : automations.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border">
            <EmptyState
              icon={Zap}
              title="No Automation Rules Configured"
              description="Create an auto-responder or click one of the quick recipes above to automate WhatsApp responses."
              actionLabel="Create First Rule"
              onAction={() => handleOpenCreate()}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((rule) => {
              let triggerConfig: any = {};
              let actions: any[] = [];
              try {
                triggerConfig = JSON.parse(rule.triggerConfig);
                actions = JSON.parse(rule.actionsJson);
              } catch (error) {
                console.warn('[Automations] Failed to parse rule config for', rule.id, error);
              }

              const action = actions[0] || {};

              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-2xl border-2 transition-all bg-card space-y-3 ${
                    rule.isActive ? 'border-border hover:border-primary' : 'border-border opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{rule.name}</h4>
                      {rule.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{rule.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(rule.id, rule.isActive)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          rule.isActive
                            ? 'bg-brand-subtle text-brand-subtle-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                        title={rule.isActive ? 'Disable Rule' : 'Enable Rule'}
                        aria-label={rule.isActive ? 'Disable Rule' : 'Enable Rule'}
                      >
                        {rule.isActive ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg"
                        title="Delete Rule"
                        aria-label="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Trigger Details */}
                  <div className="p-2.5 bg-muted rounded-xl border border-border space-y-1.5 text-xs">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>When Customer Message</span>
                      <span className="text-primary bg-brand-subtle px-1 py-0.5 rounded border border-transparent">
                        {triggerConfig.matchType}
                      </span>
                    </div>

                    {triggerConfig.matchType !== 'ANY_INBOUND' && (
                      <div className="flex flex-wrap gap-1">
                        {(triggerConfig.keywords || []).map((kw: string, i: number) => (
                          <span
                            key={i}
                            className="bg-card px-2 py-0.5 rounded border border-border text-[11px] font-mono text-foreground font-semibold"
                          >
                            &ldquo;{kw}&rdquo;
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Details */}
                  <div className="p-2.5 bg-brand-subtle/50 rounded-xl border border-transparent space-y-1 text-xs">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-brand-subtle-foreground uppercase tracking-wider">
                      <span>Then Execute Action</span>
                    </div>
                    {action.type === 'SEND_TEXT' && (
                      <p className="text-[11px] text-foreground italic line-clamp-2">
                        💬 Auto-reply: &ldquo;{action.payload?.text}&rdquo;
                      </p>
                    )}
                    {action.type === 'SEND_TEMPLATE' && (
                      <p className="text-[11px] text-foreground font-mono">
                        📋 Send Approved Template: &ldquo;{action.payload?.templateName}&rdquo;
                      </p>
                    )}
                    {action.type === 'ADD_TAG' && (
                      <p className="text-[11px] text-brand-subtle-foreground font-semibold">
                        🏷️ Add Tag: &ldquo;{action.payload?.tagName}&rdquo;
                      </p>
                    )}
                    {action.type === 'ASSIGN_GROUP' && (
                      <p className="text-[11px] text-brand-subtle-foreground font-semibold">
                        👥 Assign to Group: &ldquo;{groups.find((g) => g.id === action.payload?.groupId)?.name || action.payload?.groupId}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
                    <span>Dispatched: <strong className="text-foreground">{rule.executionCount} times</strong></span>
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl border border-border max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">
                {editingId ? 'Edit Automation Rule' : 'Create New Automation Rule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAutomation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Rule Name *</label>
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
                <label className="block text-xs font-semibold text-foreground mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Automatically replies when price is mentioned"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="input-base text-xs"
                />
              </div>

              {/* Trigger Condition */}
              <div className="p-3.5 bg-muted rounded-xl border border-border space-y-3">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  1. When Customer Sends a WhatsApp Message
                </label>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Matching Rule</label>
                  <select
                    value={formMatchType}
                    onChange={(e) => setFormMatchType(e.target.value as any)}
                    className="input-base text-xs font-medium"
                  >
                    <option value="CONTAINS">Message Contains Any Keyword</option>
                    <option value="EXACT">Message Is Exact Word Match</option>
                    <option value="STARTS_WITH">Message Starts With Keyword</option>
                    <option value="REGEX">Message Matches Regex Pattern (Advanced)</option>
                    <option value="ANY_INBOUND">Any Incoming Message (Welcome Sequence)</option>
                  </select>
                </div>

                {formMatchType !== 'ANY_INBOUND' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      {formMatchType === 'REGEX' ? 'Regex Patterns (Comma-separated)' : 'Keywords (Comma-separated)'}
                    </label>
                    <input
                      type="text"
                      placeholder={formMatchType === 'REGEX' ? 'e.g. ^(price|cost)\\b, \\bdemo\\b' : 'e.g. price, pricing, cost, rate'}
                      value={formKeywords}
                      onChange={(e) => setFormKeywords(e.target.value)}
                      className="input-base text-xs font-mono"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Action Response */}
              <div className="p-3.5 bg-brand-subtle/50 rounded-xl border border-transparent space-y-3">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  2. Automatically Do This
                </label>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Action Type</label>
                  <select
                    value={formActionType}
                    onChange={(e) => setFormActionType(e.target.value as any)}
                    className="input-base text-xs font-medium"
                  >
                    <option value="SEND_TEXT">Send WhatsApp Text Message</option>
                    <option value="SEND_TEMPLATE">Send Pre-Approved WhatsApp Template</option>
                    <option value="ADD_TAG">Add Tag to Customer (e.g. Hot Lead)</option>
                    <option value="ASSIGN_GROUP">Assign Customer to a Group</option>
                  </select>
                </div>

                {formActionType === 'SEND_TEXT' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Auto-Reply Text</label>
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
                    <label className="block text-xs font-semibold text-foreground mb-1">Select Template</label>
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
                    <label className="block text-xs font-semibold text-foreground mb-1">Tag Name</label>
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

                {formActionType === 'ASSIGN_GROUP' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Group</label>
                    <select
                      value={formGroupId}
                      onChange={(e) => setFormGroupId(e.target.value)}
                      className="input-base text-xs font-medium"
                      required
                    >
                      <option value="">Select a group...</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    {groups.length === 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">No groups exist yet — create one in Contacts first.</p>
                    )}
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
