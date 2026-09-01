'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Plus,
  Sparkles,
  Zap,
  Globe,
  Trash2,
  Brain,
  X,
  Pencil,
  Play,
  Pause,
  FlaskConical,
  Loader2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function BotsManagementPage() {
  const confirm = useConfirm();
  const [bots, setBots] = useState<any[]>([]);
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<'KEYWORD' | 'AI' | 'HTTP'>('AI');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a friendly customer service AI assistant on WhatsApp. Answer concisely and politely.'
  );
  const [selectedKbId, setSelectedKbId] = useState('');
  const [keywordList, setKeywordList] = useState('price, pricing, help, order');
  const [matchType, setMatchType] = useState('CONTAINS');
  const [httpWebhookUrl, setHttpWebhookUrl] = useState('');
  const [replyText, setReplyText] = useState('Hello! Thanks for reaching out.');
  const [saving, setSaving] = useState(false);

  // Test panel state
  const [testingBot, setTestingBot] = useState<any | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchBotsAndKbs = async () => {
    try {
      setLoading(true);
      const [botRes, kbRes] = await Promise.all([
        fetch('/api/bots'),
        fetch('/api/knowledge-bases'),
      ]);
      if (botRes.ok) setBots(await botRes.json());
      if (kbRes.ok) setKbs(await kbRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBotsAndKbs();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setKind('AI');
    setAiProvider('gemini');
    setAiApiKey('');
    setSystemPrompt('You are a friendly customer service AI assistant on WhatsApp. Answer concisely and politely.');
    setSelectedKbId('');
    setKeywordList('price, pricing, help, order');
    setMatchType('CONTAINS');
    setHttpWebhookUrl('');
    setReplyText('Hello! Thanks for reaching out.');
  };

  const handleOpenEdit = (bot: any) => {
    setEditingId(bot.id);
    setName(bot.name || '');
    setDescription(bot.description || '');
    setKind(bot.kind || 'AI');
    setSelectedKbId(bot.knowledgeBaseId || '');

    let triggerConfig: any = {};
    try {
      triggerConfig = JSON.parse(bot.triggerConfig || '{}');
    } catch (error) {
      console.warn('[Bots] Failed to parse triggerConfig for edit:', error);
    }
    setMatchType(triggerConfig.matchType || 'CONTAINS');
    setKeywordList(Array.isArray(triggerConfig.keywords) ? triggerConfig.keywords.join(', ') : '');
    setHttpWebhookUrl(triggerConfig.webhookUrl || '');

    if (bot.kind === 'AI') {
      let aiConfig: any = {};
      try {
        aiConfig = JSON.parse(bot.aiConfig || '{}');
      } catch (error) {
        console.warn('[Bots] Failed to parse aiConfig for edit:', error);
      }
      setAiProvider(aiConfig.provider || 'gemini');
      setSystemPrompt(aiConfig.systemPrompt || '');
      setAiApiKey(aiConfig.hasApiKey ? '••••••••••••' : '');
    }

    if (bot.kind === 'KEYWORD') {
      let actions: any[] = [];
      try {
        actions = JSON.parse(bot.actionsJson || '[]');
      } catch (error) {
        console.warn('[Bots] Failed to parse actionsJson for edit:', error);
      }
      setReplyText(actions.find((a) => a.type === 'SEND_TEXT')?.payload?.text || '');
    }

    setShowCreateModal(true);
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const keywords = keywordList
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const triggerConfig = {
        matchType,
        keywords,
        webhookUrl: kind === 'HTTP' ? httpWebhookUrl.trim() : undefined,
      };

      const aiConfig = kind === 'AI'
        ? {
            provider: aiProvider,
            apiKey: aiApiKey.trim() && !aiApiKey.includes('••••') ? aiApiKey.trim() : undefined,
            systemPrompt,
          }
        : undefined;

      const actionsJson = kind === 'KEYWORD'
        ? [{ type: 'SEND_TEXT', payload: { text: replyText } }]
        : [];

      const res = await fetch(editingId ? `/api/bots/${editingId}` : '/api/bots', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          kind,
          triggerConfig,
          aiConfig,
          actionsJson,
          knowledgeBaseId: selectedKbId || undefined,
          ...(editingId ? {} : { isActive: true }),
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchBotsAndKbs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBot = async (id: string) => {
    if (!(await confirm({ title: 'Delete this bot?', destructive: true, confirmLabel: 'Delete' }))) return;
    try {
      await fetch(`/api/bots/${id}`, { method: 'DELETE' });
      fetchBotsAndKbs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (bot: any) => {
    try {
      await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !bot.isActive }),
      });
      fetchBotsAndKbs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenTest = (bot: any) => {
    setTestingBot(bot);
    setTestMessage('');
    setTestResult(null);
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testingBot || !testMessage.trim()) return;

    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/bots/${testingBot.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMessage.trim() }),
      });
      const data = await res.json();
      setTestResult(res.ok ? data : { error: data.error || 'Test request failed' });
    } catch (err: any) {
      setTestResult({ error: err.message || 'Network error' });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Bots & AI Agents</h1>
        <p className="text-xs text-muted-foreground">
          Configure 24/7 AI conversation agents, Knowledge Base RAG retrieval, and keyword responders
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/automations"
            className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Automations
          </Link>
          <Link
            href="/automations/knowledge"
            className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Knowledge Base &rarr;
          </Link>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Bot</span>
        </button>
      </div>

      {/* Bots List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-base p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <Skeleton variant="rounded" width={36} height={36} />
                <Skeleton width={120} height={14} />
              </div>
              <Skeleton lines={2} />
            </div>
          ))}
        </div>
      ) : bots.length === 0 ? (
        <div className="card-base">
          <EmptyState
            icon={Bot}
            title="No Active Bots Found"
            description="Deploy an AI assistant powered by Gemini or Claude to answer incoming customer inquiries 24/7."
            actionLabel="Create Bot"
            onAction={() => {
              resetForm();
              setShowCreateModal(true);
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bots.map((bot) => {
            const isAi = bot.kind === 'AI';
            const isHttp = bot.kind === 'HTTP';

            return (
              <div
                key={bot.id}
                className={`card-base p-5 flex flex-col justify-between space-y-4 hover:border-input transition-all ${bot.isActive ? '' : 'opacity-60'}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                          isAi
                            ? 'bg-purple-50 border-purple-200 text-purple-600'
                            : isHttp
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : 'bg-brand-subtle border-transparent text-primary'
                        }`}
                      >
                        {isAi ? <Sparkles className="w-4 h-4" /> : isHttp ? <Globe className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{bot.name}</h4>
                        <span className="text-2xs text-muted-foreground font-semibold uppercase">{bot.kind} BOT</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenTest(bot)}
                        className="text-muted-foreground hover:text-purple-600 transition-colors p-1"
                        aria-label="Test bot"
                        title="Test bot"
                      >
                        <FlaskConical className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(bot)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label="Edit bot"
                        title="Edit bot"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(bot)}
                        className={`transition-colors p-1 ${bot.isActive ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-muted-foreground'}`}
                        aria-label={bot.isActive ? 'Pause bot' : 'Activate bot'}
                        title={bot.isActive ? 'Pause bot' : 'Activate bot'}
                      >
                        {bot.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteBot(bot.id)}
                        className="text-muted-foreground hover:text-rose-600 transition-colors p-1"
                        aria-label="Delete bot"
                        title="Delete bot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {bot.description || 'No description provided.'}
                  </p>

                  {bot.knowledgeBase && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-2xs">
                      <Brain className="w-3.5 h-3.5" />
                      <span>KB: {bot.knowledgeBase.name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-2xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" />
                    {bot.executionCount || 0} runs
                  </span>
                  <span className={`font-semibold ${bot.isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {bot.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Bot Modal */}
      <Modal
        open={showCreateModal}
        onOpenChange={(o) => {
          if (!o) {
            setShowCreateModal(false);
            resetForm();
          }
        }}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-subtle text-primary">
              <Bot className="size-4" />
            </span>
            {editingId ? 'Edit WhatsApp bot' : 'Create WhatsApp bot'}
          </span>
        }
        description="Configure triggers, AI personality and knowledge base"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="bot-form" disabled={saving || !name.trim()}>
              {saving ? (editingId ? 'Saving…' : 'Creating…') : editingId ? 'Save changes' : 'Deploy bot'}
            </Button>
          </>
        }
      >
        <form id="bot-form" onSubmit={handleCreateBot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Bot Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24/7 AI Customer Concierge"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Bot Kind</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['AI', 'KEYWORD', 'HTTP'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        kind === k
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              {kind === 'AI' && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-2xs font-semibold text-purple-700 mb-1">AI Provider</label>
                      <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value)}
                        className="input-base text-xs"
                      >
                        <option value="gemini">Google Gemini (Recommended)</option>
                        <option value="openai">OpenAI (GPT-4o)</option>
                        <option value="anthropic">Anthropic (Claude 3.5)</option>
                        <option value="openrouter">OpenRouter (Meta Llama 3.3)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-2xs font-semibold text-purple-700 mb-1">Attach Knowledge Base</label>
                      <select
                        value={selectedKbId}
                        onChange={(e) => setSelectedKbId(e.target.value)}
                        className="input-base text-xs"
                      >
                        <option value="">None (General Assistant)</option>
                        {kbs.map((kb) => (
                          <option key={kb.id} value={kb.id}>
                            {kb.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-semibold text-purple-700 mb-1">API Key (Encrypted at rest)</label>
                    <input
                      type="password"
                      placeholder="Paste provider API key (or leave empty to use server ENV)"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      className="input-base text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-semibold text-purple-700 mb-1">System Instructions</label>
                    <textarea
                      rows={3}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="input-base text-xs resize-none font-sans py-2.5 h-auto"
                    />
                  </div>
                </div>
              )}

              {kind === 'KEYWORD' && (
                <div className="space-y-3 p-4 rounded-2xl bg-muted border border-border">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Keywords (comma-separated)</label>
                    <input
                      type="text"
                      value={keywordList}
                      onChange={(e) => setKeywordList(e.target.value)}
                      className="input-base text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Response Message</label>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="input-base text-xs resize-none py-2.5 h-auto"
                    />
                  </div>
                </div>
              )}

              {kind === 'HTTP' && (
                <div className="space-y-3 p-4 rounded-2xl bg-muted border border-border">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Webhook Target URL</label>
                    <input
                      type="url"
                      placeholder="https://api.yourdomain.com/whatsapp-hook"
                      value={httpWebhookUrl}
                      onChange={(e) => setHttpWebhookUrl(e.target.value)}
                      className="input-base text-xs"
                    />
                  </div>
                </div>
              )}

        </form>
      </Modal>

      {/* Test Bot Panel */}
      <Modal
        open={!!testingBot}
        onOpenChange={(o) => !o && setTestingBot(null)}
        size="sm"
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <FlaskConical className="size-4" />
            </span>
            Test “{testingBot?.name}”
          </span>
        }
        description="Simulates a reply without sending a real WhatsApp message"
      >
        {testingBot && (
          <>
            <form onSubmit={handleRunTest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Test Message (as if from a customer)</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. What are your prices?"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="input-base text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={testLoading || !testMessage.trim()}
                className="btn-primary text-xs w-full justify-center"
              >
                {testLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Run Test</span>
                )}
              </button>
            </form>

            {testResult && (
              <div className="space-y-2">
                {testResult.error ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {testResult.error}
                  </div>
                ) : testResult.triggerMatched === false ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    {testResult.note || 'This message would not trigger the bot.'}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-brand-subtle border border-transparent space-y-1.5">
                    <span className="text-2xs font-bold text-primary uppercase tracking-wider">Bot Would Reply</span>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{testResult.reply || '(no reply text)'}</p>
                    {testResult.usedKnowledgeBase && (
                      <span className="inline-flex items-center gap-1 text-2xs text-purple-700 font-semibold">
                        <Brain className="w-3 h-3" /> Used Knowledge Base context
                      </span>
                    )}
                    {testResult.note && (
                      <p className="text-2xs text-amber-700">{testResult.note}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
