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
  Settings,
  Brain,
  Power,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';

export default function BotsManagementPage() {
  const [bots, setBots] = useState<any[]>([]);
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
            apiKey: aiApiKey.trim() || undefined,
            systemPrompt,
          }
        : undefined;

      const actionsJson = kind === 'KEYWORD'
        ? [{ type: 'SEND_TEXT', payload: { text: replyText } }]
        : [];

      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          kind,
          triggerConfig,
          aiConfig,
          actionsJson,
          knowledgeBaseId: selectedKbId || undefined,
          isActive: true,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setName('');
        setDescription('');
        fetchBotsAndKbs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBot = async (id: string) => {
    if (!confirm('Delete this bot?')) return;
    try {
      await fetch(`/api/bots/${id}`, { method: 'DELETE' });
      fetchBotsAndKbs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Bots & AI Agents</h1>
          <p className="text-xs text-slate-400">
            Configure 24/7 AI conversation agents, Knowledge Base RAG retrieval, and keyword responders
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/automations"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition-colors"
            >
              &larr; Automations
            </Link>
            <Link
              href="/automations/knowledge"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Knowledge Base &rarr;
            </Link>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Bot</span>
          </button>
        </div>

        {/* Bots List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bots.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Active Bots Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Deploy an AI assistant powered by Gemini or Claude to answer incoming customer inquiries 24/7.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4" /> Create Bot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bots.map((bot) => {
              const isAi = bot.kind === 'AI';
              const isHttp = bot.kind === 'HTTP';

              return (
                <div
                  key={bot.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                            isAi
                              ? 'bg-purple-600/10 border-purple-500/20 text-purple-400'
                              : isHttp
                              ? 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                              : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {isAi ? <Sparkles className="w-4 h-4" /> : isHttp ? <Globe className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{bot.name}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{bot.kind} BOT</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteBot(bot.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {bot.description || 'No description provided.'}
                    </p>

                    {bot.knowledgeBase && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-800/50 text-purple-300 text-[11px]">
                        <Brain className="w-3.5 h-3.5" />
                        <span>KB: {bot.knowledgeBase.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      {bot.executionCount || 0} runs
                    </span>
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Bot Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create WhatsApp Bot</h3>
                  <p className="text-xs text-slate-400">Configure triggers, AI personality, and Knowledge Base</p>
                </div>
              </div>

              <form onSubmit={handleCreateBot} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bot Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24/7 AI Customer Concierge"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bot Kind</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['AI', 'KEYWORD', 'HTTP'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          kind === k
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                {kind === 'AI' && (
                  <div className="space-y-3.5 p-4 rounded-2xl bg-purple-950/20 border border-purple-900/40">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-purple-300 mb-1">AI Provider</label>
                        <select
                          value={aiProvider}
                          onChange={(e) => setAiProvider(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs"
                        >
                          <option value="gemini">Google Gemini (Recommended)</option>
                          <option value="openai">OpenAI (GPT-4o)</option>
                          <option value="anthropic">Anthropic (Claude 3.5)</option>
                          <option value="openrouter">OpenRouter (Meta Llama 3.3)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-purple-300 mb-1">Attach Knowledge Base</label>
                        <select
                          value={selectedKbId}
                          onChange={(e) => setSelectedKbId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs"
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
                      <label className="block text-[11px] font-semibold text-purple-300 mb-1">API Key (Encrypted at rest)</label>
                      <input
                        type="password"
                        placeholder="Paste provider API key (or leave empty to use server ENV)"
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-purple-300 mb-1">System Instructions</label>
                      <textarea
                        rows={3}
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs resize-none font-sans"
                      />
                    </div>
                  </div>
                )}

                {kind === 'KEYWORD' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Keywords (comma-separated)</label>
                      <input
                        type="text"
                        value={keywordList}
                        onChange={(e) => setKeywordList(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Response Message</label>
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs resize-none"
                      />
                    </div>
                  </div>
                )}

                {kind === 'HTTP' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Webhook Target URL</label>
                      <input
                        type="url"
                        placeholder="https://api.yourdomain.com/whatsapp-hook"
                        value={httpWebhookUrl}
                        onChange={(e) => setHttpWebhookUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Deploy Bot'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
