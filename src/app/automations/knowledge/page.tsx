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
import { useConfirm } from '@/lib/hooks/use-confirm';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export default function KnowledgeBasePage() {
  const confirm = useConfirm();
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
    if (!(await confirm({ title: 'Delete this knowledge base?', destructive: true, confirmLabel: 'Delete' }))) return;
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
        <h1 className="text-2xl font-black text-foreground tracking-tight">AI Knowledge Base</h1>
        <p className="text-xs text-muted-foreground">
          Train customer support AI bots with company factsheets, FAQs, and pricing notes
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/automations"
            className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Automations Overview
          </Link>
          <Link
            href="/automations/bots"
            className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                        <h4 className="text-sm font-bold text-foreground">{kb.name}</h4>
                        <span className="text-2xs text-purple-600 font-semibold">{kb.sourceType}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingKb(kb)}
                        className="text-muted-foreground hover:text-purple-600 transition-colors p-1"
                        aria-label="View knowledge base content"
                        title="View full content"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(kb.id)}
                        className="text-muted-foreground hover:text-rose-600 transition-colors p-1"
                        aria-label="Delete knowledge base"
                        title="Delete knowledge base"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingKb(kb)}
                    className="w-full text-left text-xs text-muted-foreground line-clamp-3 bg-muted p-3 rounded-xl border border-border font-mono text-2xs hover:border-purple-300 transition-colors"
                  >
                    {kb.contentMarkdown}
                  </button>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-2xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    {chunkCount} indexing chunks
                  </span>
                  <span className="text-primary font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Modal */}
      <Modal
        open={showCreateModal}
        onOpenChange={(o) => !o && setShowCreateModal(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sparkles className="size-4" />
            </span>
            AI knowledge base generator
          </span>
        }
        description="Paste unorganized notes and AI will build a structured FAQ"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="kb-form" disabled={generating || !name.trim() || !rawNotes.trim()}>
              <Sparkles />
              {generating ? 'Structuring…' : 'Generate & save'}
            </Button>
          </>
        }
      >
        {errorMsg && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{errorMsg}</div>
        )}
        <form id="kb-form" onSubmit={handleGenerateAndSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Knowledge Base Title</label>
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
                <label className="block text-xs font-semibold text-foreground mb-1.5">
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
                  <label className="block text-2xs font-semibold text-purple-700 mb-1">AI Provider</label>
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
                  <label className="block text-2xs font-semibold text-purple-700 mb-1">API Key</label>
                  <input
                    type="password"
                    placeholder="Or leave empty to use server ENV"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="input-base text-xs"
                  />
                </div>
              </div>

        </form>
      </Modal>

      {/* View Content Modal */}
      <Modal
        open={!!viewingKb}
        onOpenChange={(o) => !o && setViewingKb(null)}
        size="xl"
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <BookOpen className="size-4" />
            </span>
            {viewingKb?.name}
          </span>
        }
        description={viewingKb ? `${viewingKb.sourceType} · used by bots that select it` : undefined}
      >
        {viewingKb && (
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted p-4 font-mono text-xs text-foreground">
            {viewingKb.contentMarkdown}
          </div>
        )}
      </Modal>
    </div>
  );
}
