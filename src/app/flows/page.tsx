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
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

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
        <h1 className="text-2xl font-black text-foreground tracking-tight">Conversation Flows & Visual Builder</h1>
        <p className="text-xs text-muted-foreground">
          Automated multi-step qualification funnels, interactive Meta list messages, and drag-and-drop conversational journeys
        </p>
      </div>

      {/* Example Lead Qualification Flow Showcase Banner */}
      <div className="bg-brand-subtle/40 border border-transparent rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-brand-subtle text-brand-subtle-foreground">
                Active Engine
              </span>
              <span className="text-xs font-semibold text-muted-foreground">Example: Lead Qualification</span>
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              4-Step Interactive Lead Qualification Funnel
            </h2>
            <p className="text-xs text-muted-foreground">
              Automatically engages inbound leads with a keyword trigger and quick-reply questions covering Business Activity, Region, Goal, and Timeline, tags qualified leads by temperature (<span className="text-rose-600 font-bold">HOT 🔥</span> / <span className="text-amber-600 font-bold">WARM 🟡</span>), and hands off to your team in the inbox. Duplicate and customize it for your own business.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-2xl p-3 text-center">
              <span className="text-2xs font-medium text-muted-foreground block">Step 1</span>
              <span className="text-xs font-bold text-foreground">Activity List</span>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3 text-center">
              <span className="text-2xs font-medium text-muted-foreground block">Step 2</span>
              <span className="text-xs font-bold text-foreground">Region List</span>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3 text-center">
              <span className="text-2xs font-medium text-muted-foreground block">Step 3</span>
              <span className="text-xs font-bold text-foreground">Goal List</span>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3 text-center">
              <span className="text-2xs font-medium text-muted-foreground block">Step 4</span>
              <span className="text-xs font-bold text-foreground">Timeline List</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm transition-all"
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
                className="group card-base hover:border-foreground/20 p-5 flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-brand-subtle border border-transparent text-primary flex items-center justify-center">
                        <GitMerge className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {flow.name}
                        </h4>
                        <span className="text-2xs text-muted-foreground">v{flow.version || 1}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold border ${
                        isPublished
                          ? 'bg-brand-subtle border-transparent text-primary'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      {flow.status}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {flow.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                  <span className="text-2xs text-muted-foreground flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-primary" />
                    {flow._count?.runs || 0} executions
                  </span>

                  <Link
                    href={`/flows/${flow.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted text-xs font-semibold text-foreground transition-colors"
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
      <Modal
        open={showCreateModal}
        onOpenChange={(o) => !o && setShowCreateModal(false)}
        size="sm"
        title={
          <span className="inline-flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-subtle text-primary">
              <GitMerge className="size-4" />
            </span>
            Create visual flow
          </span>
        }
        description="Initialize a new chatbot canvas"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="flow-form" disabled={creating || !newFlowName.trim()}>
              {creating ? 'Creating…' : 'Open canvas'}
            </Button>
          </>
        }
      >
        <form id="flow-form" onSubmit={handleCreateFlow} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Flow Name</label>
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
                <label className="block text-xs font-semibold text-foreground mb-1.5">Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Describe what this customer journey does..."
                  value={newFlowDesc}
                  onChange={(e) => setNewFlowDesc(e.target.value)}
                  className="input-base text-xs resize-none py-2.5 h-auto"
                />
              </div>

        </form>
      </Modal>
    </div>
  );
}
