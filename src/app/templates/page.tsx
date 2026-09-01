'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { WhatsAppMockupPreview } from '@/components/templates/WhatsAppMockupPreview';
import { TemplateBuilderModal } from '@/components/templates/TemplateBuilderModal';
import { SendTestModal } from '@/components/templates/SendTestModal';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ text: string; ok: boolean } | null>(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testModalTemplate, setTestModalTemplate] = useState<any | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  const fetchTemplates = () => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTemplates(list);
        if (list.length > 0 && !previewTemplate) {
          setPreviewTemplate(list[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Reactive polling: If any template is PENDING, poll every 4s to detect Meta approval automatically
  useEffect(() => {
    const hasPending = templates.some((t) => t.status === 'PENDING');
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetch('/api/templates')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setTemplates(data);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [templates]);

  const handleSyncMeta = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/templates/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncNotice({ text: data.message, ok: true });
        fetchTemplates();
      } else {
        setSyncNotice({ text: data.error || 'Failed to sync templates from Meta', ok: false });
      }
    } catch {
      setSyncNotice({ text: 'Unable to reach server to sync templates.', ok: false });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 8000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">WhatsApp Template Manager</h1>
            <InfoTooltip content="Manage, create, and track real-time approvals for Meta-approved WhatsApp message templates." />
          </div>
          <p className="text-xs text-slate-500">
            Full Meta WhatsApp Manager engine: create templates with realistic variables and track auto-approvals in real-time
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Tooltip content="Pulls all approved, pending, and rejected templates directly from your Meta WABA account.">
            <button
              onClick={handleSyncMeta}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync from Meta'}</span>
            </button>
          </Tooltip>

          <Tooltip content="Design a new template with variables and call-to-action buttons to submit for Meta approval.">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Template</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {syncNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            syncNotice.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {syncNotice.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{syncNotice.text}</span>
        </div>
      )}

      {/* Main Grid: Template Cards & Live WhatsApp Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border-2 border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton width={140} height={14} />
                    <Skeleton width={70} height={18} variant="rounded" />
                  </div>
                  <Skeleton lines={2} />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200">
              <EmptyState
                icon={FileText}
                title="No Templates Found"
                description={'Create a template with custom variables or click "Sync from Meta" to pull your existing WhatsApp Business templates.'}
                actionLabel="Create First Template"
                onAction={() => setIsCreateOpen(true)}
              />
            </div>
          ) : (
            templates.map((tpl) => {
              let components: any[] = [];
              try {
                components = typeof tpl.components === 'string' ? JSON.parse(tpl.components) : tpl.components;
              } catch {}

              const bodyText = components.find((c) => c.type === 'BODY')?.text || '';
              const isSelected = previewTemplate?.id === tpl.id;

              return (
                <div
                  key={tpl.id}
                  onClick={() => setPreviewTemplate(tpl)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white space-y-3 ${
                    isSelected
                      ? 'border-emerald-600 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <h3 className="text-xs font-bold text-slate-900 font-mono">{tpl.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          tpl.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tpl.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tpl.status === 'APPROVED' ? '● Approved' : tpl.status === 'PENDING' ? '⏳ Meta Reviewing...' : '✕ Rejected'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {bodyText}
                  </p>

                  {/* Rejection Alert */}
                  {tpl.status === 'REJECTED' && (
                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Meta Rejection Reason:</span>
                      </div>
                      <p className="text-[11px] text-rose-700">
                        {tpl.rejectedReason || 'Template violated WhatsApp Business Policy or missing realistic sample values.'}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCreateOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 hover:text-rose-900 underline mt-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Fix & Resubmit</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-3 text-slate-400 font-semibold uppercase text-[10px]">
                      <span>{tpl.category}</span>
                      <span>•</span>
                      <span>{tpl.language}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tooltip content="Send a single test message of this template to your personal WhatsApp number.">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTestModalTemplate(tpl);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Test</span>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Preview Side */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center sticky top-24 h-fit">
          <div className="flex items-center justify-between w-full mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                WhatsApp Phone Mockup
              </h3>
              <InfoTooltip content="Real-time representation of how this template will appear inside the recipient's WhatsApp mobile application." />
            </div>
            {previewTemplate && (
              <button
                onClick={() => setTestModalTemplate(previewTemplate)}
                className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>Test Template</span>
              </button>
            )}
          </div>

          {previewTemplate ? (
            <WhatsAppMockupPreview
              templateName={previewTemplate.name}
              category={previewTemplate.category}
              components={previewTemplate.components}
              sampleVariables={{ '1': 'Customer', '2': 'Apex Store', '3': 'PROMO20' }}
            />
          ) : (
            <div className="h-80 flex items-center justify-center text-xs text-slate-400">
              Select or create a template to view mockup
            </div>
          )}
        </div>
      </div>

      {/* Builder Modal */}
      <TemplateBuilderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchTemplates}
      />

      {/* Send Test Modal */}
      <SendTestModal
        isOpen={!!testModalTemplate}
        template={testModalTemplate}
        onClose={() => setTestModalTemplate(null)}
      />
    </div>
  );
}
