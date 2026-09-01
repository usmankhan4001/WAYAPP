'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain,
  Plus,
  Sparkles,
  BookOpen,
  Trash2,
  CheckCircle2,
  Layers,
  X,
  Eye,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function KnowledgeBasePage() {
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewingKb, setViewingKb] = useState<any | null>(null);

  const fetchKbs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/knowledge-bases');
      if (res.ok) {
        const data = await res.json();
        setKbs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKbs();
  }, []);

  const handleGenerateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rawNotes.trim()) return;

    setGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/knowledge-bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rawNotes,
          action: 'GENERATE',
          aiConfig: {
            provider: aiProvider,
            apiKey: aiApiKey.trim() || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to generate Knowledge Base');
      } else {
        setShowCreateModal(false);
        setName('');
        setRawNotes('');
        setAiApiKey('');
        fetchKbs();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Knowledge Base?')) return;
    try {
      await fetch(`/api/knowledge-bases/${id}`, { method: 'DELETE' });
      fetchKbs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Knowledge Base</h1>
        <p className="text-xs text-slate-500">
          Train customer support AI bots with company factsheets, FAQs, and pricing notes
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/automations"
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            &larr; Automations Overview
          </Link>
          <Link
            href="/automations/bots"
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            Bots & AI Agents &rarr;
          </Link>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Knowledge Base</span>
        </button>
      </div>

      {/* Knowledge Base Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-base p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <Skeleton variant="rounded" width={36} height={36} />
                <Skeleton width={120} height={14} />
              </div>
              <Skeleton lines={3} />
            </div>
          ))}
        </div>
      ) : kbs.length === 0 ? (
        <div className="card-base">
          <EmptyState
            icon={Brain}
            title="No Knowledge Bases Found"
            description="Paste your raw business notes or FAQ and let AI transform them into structured knowledge chunks for your WhatsApp bots."
            actionLabel="Create Knowledge Base"
            onAction={() => setShowCreateModal(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kbs.map((kb) => {
            let chunkCount = 0;
            try {
              chunkCount = JSON.parse(kb.chunks || '[]').length;
            } catch (error) {
              console.warn('[KnowledgeBase] Failed to parse chunks for', kb.id, error);
            }

            return (
              <div
                key={kb.id}
                className="card-base p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{kb.name}</h4>
                        <span className="text-[10px] text-purple-600 font-semibold">{kb.sourceType}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingKb(kb)}
                        className="text-slate-400 hover:text-purple-600 transition-colors p-1"
                        aria-label="View knowledge base content"
                        title="View full content"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(kb.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        aria-label="Delete knowledge base"
                        title="Delete knowledge base"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingKb(kb)}
                    className="w-full text-left text-xs text-slate-500 line-clamp-3 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] hover:border-purple-300 transition-colors"
                  >
                    {kb.contentMarkdown}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    {chunkCount} indexing chunks
                  </span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI Knowledge Base Generator</h3>
                  <p className="text-xs text-slate-500">Paste unorganized notes and AI will build a structured FAQ</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleGenerateAndSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Knowledge Base Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Company Profile & Pricing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Raw Business Notes, Product FAQ, or Pricing
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste website text, bullet points, refund policies, opening hours, or FAQs here..."
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  className="input-base text-xs resize-none font-sans py-2.5 h-auto"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200">
                <div>
                  <label className="block text-[11px] font-semibold text-purple-700 mb-1">AI Provider</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="input-base text-xs"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="anthropic">Anthropic (Claude 3.5)</option>
                    <option value="openrouter">OpenRouter (Meta Llama 3.3)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-purple-700 mb-1">API Key</label>
                  <input
                    type="password"
                    placeholder="Or leave empty to use server ENV"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="input-base text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || !name.trim() || !rawNotes.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generating ? 'Structuring Knowledge...' : 'Generate & Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Content Modal */}
      {viewingKb && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewingKb.name}</h3>
                  <p className="text-xs text-slate-500">{viewingKb.sourceType} &bull; used by bots that select it</p>
                </div>
              </div>
              <button
                onClick={() => setViewingKb(null)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap font-mono">
              {viewingKb.contentMarkdown}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
