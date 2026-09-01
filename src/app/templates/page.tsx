'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, RefreshCw, Send, AlertCircle, Edit3 } from 'lucide-react';

import { WhatsAppMockupPreview } from '@/components/templates/WhatsAppMockupPreview';
import { TemplateBuilderModal } from '@/components/templates/TemplateBuilderModal';
import { SendTestModal } from '@/components/templates/SendTestModal';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Template = Record<string, any>;

const STATUS: Record<string, { tone: string; label: string }> = {
  APPROVED: { tone: 'success', label: '● Approved' },
  PENDING: { tone: 'warning', label: '⏳ Meta reviewing…' },
  REJECTED: { tone: 'destructive', label: '✕ Rejected' },
};

export default function TemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testModalTemplate, setTestModalTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const fetchTemplates = () => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        const list: Template[] = Array.isArray(data) ? data : [];
        setTemplates(list);
        setPreviewTemplate((prev) => prev ?? list[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!templates.some((t) => t.status === 'PENDING')) return;
    const interval = setInterval(() => {
      fetch('/api/templates')
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setTemplates(data))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [templates]);

  const handleSyncMeta = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/templates/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Templates synced', data.message);
        fetchTemplates();
      } else {
        toast.error('Sync failed', data.error || 'Failed to sync templates from Meta');
      }
    } catch {
      toast.error('Unable to reach server to sync templates.');
    } finally {
      setIsSyncing(false);
    }
  };

  const parseComponents = (tpl: Template) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (typeof tpl.components === 'string' ? JSON.parse(tpl.components) : tpl.components) as any[];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            WhatsApp template manager
            <InfoTooltip content="Manage, create and track real-time approvals for Meta-approved WhatsApp message templates." />
          </span>
        }
        description="Create templates with realistic variables and track Meta auto-approvals in real time."
        actions={
          <>
            <Tooltip content="Pulls all approved, pending and rejected templates directly from your Meta WABA account.">
              <Button variant="outline" size="sm" onClick={handleSyncMeta} disabled={isSyncing}>
                <RefreshCw className={isSyncing ? 'animate-spin text-primary' : ''} />
                {isSyncing ? 'Syncing…' : 'Sync from Meta'}
              </Button>
            </Tooltip>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus />
              Create template
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* List */}
        <div className="space-y-3 lg:col-span-7">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="flex items-center justify-between">
                    <Skeleton width={140} height={14} />
                    <Skeleton width={70} height={18} variant="rounded" />
                  </div>
                  <Skeleton lines={2} />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl bg-card ring-1 ring-foreground/10">
              <EmptyState
                icon={FileText}
                title="No templates found"
                description={'Create a template with custom variables or click "Sync from Meta" to pull your existing WhatsApp Business templates.'}
                actionLabel="Create first template"
                onAction={() => setIsCreateOpen(true)}
              />
            </div>
          ) : (
            templates.map((tpl) => {
              const components = parseComponents(tpl);
              const bodyText = components.find((c) => c.type === 'BODY')?.text || '';
              const selected = previewTemplate?.id === tpl.id;
              const status = STATUS[tpl.status] ?? STATUS.REJECTED;

              return (
                <div
                  key={tpl.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreviewTemplate(tpl)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPreviewTemplate(tpl);
                    }
                  }}
                  className={cn(
                    'w-full cursor-pointer space-y-3 rounded-xl bg-card p-4 text-left ring-1 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'ring-2 ring-primary' : 'ring-foreground/10 hover:ring-foreground/20'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className={cn('size-4 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                      <h3 className="truncate font-mono text-xs font-semibold text-foreground">{tpl.name}</h3>
                    </div>
                    <StatusBadge tone={status.tone} className="shrink-0 uppercase">
                      {status.label}
                    </StatusBadge>
                  </div>

                  <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{bodyText}</p>

                  {tpl.status === 'REJECTED' && (
                    <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertCircle className="size-3.5" />
                        <span>Meta rejection reason:</span>
                      </div>
                      <p className="text-2xs">
                        {tpl.rejectedReason || 'Template violated WhatsApp Business Policy or missing realistic sample values.'}
                      </p>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCreateOpen(true);
                        }}
                        className="mt-1 inline-flex cursor-pointer items-center gap-1 text-2xs font-semibold underline"
                      >
                        <Edit3 className="size-3" />
                        Fix &amp; resubmit
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-2 text-2xs">
                    <div className="flex items-center gap-2 text-2xs font-semibold uppercase text-muted-foreground">
                      <span>{tpl.category}</span>
                      <span>·</span>
                      <span>{tpl.language}</span>
                    </div>
                    <Tooltip content="Send a single test message of this template to your personal WhatsApp number.">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTestModalTemplate(tpl);
                        }}
                      >
                        <Send />
                        Send test
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live preview */}
        <div className="sticky top-24 flex h-fit flex-col items-center rounded-xl bg-card p-6 ring-1 ring-foreground/10 lg:col-span-5">
          <div className="mb-4 flex w-full items-center justify-between border-b border-border pb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              WhatsApp phone mockup
              <InfoTooltip content="How this template will appear inside the recipient's WhatsApp mobile app." />
            </span>
            {previewTemplate && (
              <Button variant="ghost" size="xs" onClick={() => setTestModalTemplate(previewTemplate)}>
                <Send />
                Test template
              </Button>
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
            <div className="flex h-80 items-center justify-center text-xs text-muted-foreground">
              Select or create a template to view the mockup
            </div>
          )}
        </div>
      </div>

      <TemplateBuilderModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={fetchTemplates} />
      <SendTestModal isOpen={!!testModalTemplate} template={testModalTemplate} onClose={() => setTestModalTemplate(null)} />
    </div>
  );
}
