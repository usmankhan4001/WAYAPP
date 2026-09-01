'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GitMerge,
  Plus,
  ArrowRight,
  Zap,
  Search,
  X,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Conversation Flows & Visual Builder</h1>
        <p className="text-xs text-slate-500">
          Automated multi-step qualification funnels, interactive Meta list messages, and drag-and-drop conversational journeys
        </p>
      </div>

      {/* Example Lead Qualification Flow Showcase Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-white border border-emerald-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                Active Engine
              </span>
              <span className="text-xs font-semibold text-slate-500">Example: Lead Qualification</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              4-Step Interactive Lead Qualification Funnel
            </h2>
            <p className="text-xs text-slate-600">
              Automatically engages inbound leads with a keyword trigger and quick-reply questions covering Business Activity, Region, Goal, and Timeline, tags qualified leads by temperature (<span className="text-rose-600 font-bold">HOT 🔥</span> / <span className="text-amber-600 font-bold">WARM 🟡</span>), and hands off to your team in the inbox. Duplicate and customize it for your own business.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-medium text-slate-400 block">Step 1</span>
              <span className="text-xs font-bold text-slate-900">Activity List</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-medium text-slate-400 block">Step 2</span>
              <span className="text-xs font-bold text-slate-900">Region List</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-medium text-slate-400 block">Step 3</span>
              <span className="text-xs font-bold text-slate-900">Goal List</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] font-medium text-slate-400 block">Step 4</span>
              <span className="text-xs font-bold text-slate-900">Timeline List</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chatbot flows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base text-xs pl-10"
          />
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Flow</span>
        </button>
      </div>

      {/* Flows Grid */}
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
      ) : filteredFlows.length === 0 ? (
        <div className="card-base">
          <EmptyState
            icon={GitMerge}
            title="No Visual Flows Found"
            description="Build your first drag-and-drop conversational funnel to engage customers, route inquiries, and trigger tags automatically."
            actionLabel="Create Flow"
            onAction={() => setShowCreateModal(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFlows.map((flow) => {
            const isPublished = flow.status === 'PUBLISHED';
            return (
              <div
                key={flow.id}
                className="group card-base hover:border-slate-300 p-5 flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                        <GitMerge className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {flow.name}
                        </h4>
                        <span className="text-[10px] text-slate-400">v{flow.version || 1}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isPublished
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      {flow.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                    {flow.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-emerald-600" />
                    {flow._count?.runs || 0} executions
                  </span>

                  <Link
                    href={`/flows/${flow.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <GitMerge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Visual Flow</h3>
                  <p className="text-xs text-slate-500">Initialize a new chatbot canvas</p>
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

            <form onSubmit={handleCreateFlow} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Flow Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Qualification & Onboarding"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  className="input-base text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Describe what this customer journey does..."
                  value={newFlowDesc}
                  onChange={(e) => setNewFlowDesc(e.target.value)}
                  className="input-base text-xs resize-none py-2.5 h-auto"
                />
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
                  disabled={creating || !newFlowName.trim()}
                  className="btn-primary text-xs"
                >
                  {creating ? 'Creating...' : 'Open Canvas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
