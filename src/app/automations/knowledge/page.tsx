'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain,
  Plus,
  Sparkles,
  BookOpen,
  Trash2,
  Edit,
  ArrowRight,
  FileText,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';

export default function KnowledgeBasePage() {
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to generate Knowledge Base');
      } else {
        setShowCreateModal(false);
        setName('');
        setRawNotes('');
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
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">AI Knowledge Base</h1>
          <p className="text-xs text-slate-400">
            Train customer support AI bots with company factsheets, FAQs, and pricing notes
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/automations"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition-colors"
            >
              &larr; Automations Overview
            </Link>
            <Link
              href="/automations/bots"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Bots & AI Agents &rarr;
            </Link>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Knowledge Base</span>
          </button>
        </div>

        {/* Knowledge Base Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : kbs.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/10 text-purple-400 flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Knowledge Bases Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Paste your raw business notes or FAQ and let AI transform them into structured knowledge chunks for your WhatsApp bots.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4" /> Create Knowledge Base
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {kbs.map((kb) => {
              let chunkCount = 0;
              try {
                chunkCount = JSON.parse(kb.chunks || '[]').length;
              } catch {}

              return (
                <div
                  key={kb.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{kb.name}</h4>
                          <span className="text-[10px] text-purple-400 font-semibold">{kb.sourceType}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(kb.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-400 line-clamp-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px]">
                      {kb.contentMarkdown}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      {chunkCount} indexing chunks
                    </span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
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
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/10 text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">AI Knowledge Base Generator</h3>
                  <p className="text-xs text-slate-400">Paste unorganized notes and AI will build a structured FAQ</p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleGenerateAndSave} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Knowledge Base Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GCC Startup Company Profile & Pricing"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Raw Business Notes, Product FAQ, or Pricing
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Paste website text, bullet points, refund policies, opening hours, or FAQs here..."
                    value={rawNotes}
                    onChange={(e) => setRawNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none font-sans"
                  />
                </div>

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
                    disabled={generating || !name.trim() || !rawNotes.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generating ? 'Structuring Knowledge...' : 'Generate & Save'}</span>
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
