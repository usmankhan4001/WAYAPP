'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GitMerge,
  Plus,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
  Zap,
  Bot,
  Search,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';

export default function FlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/flows');
      if (res.ok) {
        const data = await res.json();
        setFlows(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFlowName.trim(),
          description: newFlowDesc.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/flows/${data.flow.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const filteredFlows = flows.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Visual Flow Builder</h1>
          <p className="text-xs text-slate-400">
            Design interactive chatbot conversation funnels, branching journeys, and automated actions
          </p>
        </div>
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chatbot flows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Flow</span>
          </button>
        </div>

        {/* Flows Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center mx-auto">
              <GitMerge className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Visual Flows Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Build your first drag-and-drop conversational funnel to engage customers, route inquiries, and trigger tags automatically.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4" /> Create Flow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFlows.map((flow) => {
              const isPublished = flow.status === 'PUBLISHED';
              return (
                <div
                  key={flow.id}
                  className="group bg-slate-900/80 backdrop-blur border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-emerald-950/20"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <GitMerge className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {flow.name}
                          </h4>
                          <span className="text-[10px] text-slate-500">v{flow.version || 1}</span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isPublished
                            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {flow.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                      {flow.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      {flow._count?.runs || 0} executions
                    </span>

                    <Link
                      href={`/flows/${flow.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                    >
                      <span>Edit Canvas</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Flow Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
                  <GitMerge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Visual Flow</h3>
                  <p className="text-xs text-slate-400">Initialize a new chatbot canvas</p>
                </div>
              </div>

              <form onSubmit={handleCreateFlow} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Flow Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lead Qualification & Onboarding"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Describe what this customer journey does..."
                    value={newFlowDesc}
                    onChange={(e) => setNewFlowDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
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
                    disabled={creating || !newFlowName.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Open Canvas'}
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
