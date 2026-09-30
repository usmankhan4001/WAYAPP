'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Plus, RefreshCw, Send } from 'lucide-react';

import { WhatsAppMockupPreview } from '@/components/templates/WhatsAppMockupPreview';
import { TemplateBuilderModal } from '@/components/templates/TemplateBuilderModal';
import { SendTestModal } from '@/components/templates/SendTestModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Chip } from '@/components/ui/chip';
import { ListRow } from '@/components/ui/list-row';
import { SearchField } from '@/components/ui/search-field';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useToast } from '@/components/ui/Toast';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import {
  bodyTextOf,
  categoryLabel,
  chipCounts,
  filterTemplates,
  firstLine,
  plainName,
  rejectionSentence,
  statusInfo,
  type CategoryFilter,
  type StatusFilter,
  type TemplateRecord,
} from '@/lib/templates/present';

const STATUS_CHIPS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PENDING', label: 'Waiting' },
  { key: 'REJECTED', label: 'Rejected' },
];
const CATEGORY_CHIPS: Array<{ key: CategoryFilter; label: string }> = [
  { key: 'ALL', label: 'All types' },
  { key: 'MARKETING', label: 'Promotion' },
  { key: 'UTILITY', label: 'Update' },
  { key: 'AUTHENTICATION', label: 'Login code' },
];

export default function TemplatesPage() {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [category, setCategory] = useState<CategoryFilter>('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState<TemplateRecord | null>(null);
  const [builderKey, setBuilderKey] = useState(0);
  const openBuilder = (from: TemplateRecord | null) => {
    setPrefill(from);
    setBuilderKey((k) => k + 1);
    setSheetOpen(false);
    setIsCreateOpen(true);
  };
  const [testTemplate, setTestTemplate] = useState<TemplateRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchTemplates = useCallback(() => {
    setLoadFailed(false);
    fetch('/api/templates')
      .then((res) => {
        if (!res.ok) throw new Error('bad response');
        return res.json();
      })
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // While Meta is still reviewing something, quietly check again.
  useEffect(() => {
    if (!templates.some((t) => statusInfo(t.status).key === 'PENDING')) return;
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
        toast.success('Templates updated', 'Your list now matches Meta.');
        fetchTemplates();
      } else {
        toast.error('Could not update', 'We could not reach Meta. Check your WhatsApp connection and try again.');
      }
    } catch {
      toast.error('Could not update', 'We could not reach Meta. Check your connection and try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const filters = { query, status, category };
  const visible = useMemo(() => filterTemplates(templates, filters), [templates, query, status, category]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => chipCounts(templates, filters), [templates, query, status, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected =
    templates.find((t) => String(t.id) === selectedId) ?? (isMobile ? null : visible[0] ?? null);

  const open = (t: TemplateRecord) => {
    setSelectedId(String(t.id));
    if (isMobile) setSheetOpen(true);
  };

  const details = (t: TemplateRecord) => {
    const info = statusInfo(t.status);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={info.variant}>{info.label}</Badge>
          <span className="text-sm text-muted-foreground">
            {categoryLabel(t.category)} · {t.language}
          </span>
        </div>
        {info.key === 'REJECTED' && (
          <Alert
            tone="danger"
            title="Meta did not approve this"
            action={
              <Button size="sm" variant="outline" onClick={() => openBuilder(t)}>
                Make a new one
              </Button>
            }
          >
            {rejectionSentence(t.rejectedReason)}
          </Alert>
        )}
        <WhatsAppMockupPreview components={t.components} />
        <Button className="w-full" disabled={info.key !== 'APPROVED'} onClick={() => setTestTemplate(t)}>
          <Send />
          Send a test
        </Button>
        {info.key !== 'APPROVED' && (
          <p className="text-center text-xs text-muted-foreground">You can send a test once Meta approves it.</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Templates"
        description="Messages Meta must approve before you can start a chat. Meta usually reviews within a day."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleSyncMeta} disabled={isSyncing}>
              <RefreshCw className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Updating' : 'Sync from Meta'}
            </Button>
            <Button size="sm" onClick={() => openBuilder(null)}>
              <Plus />
              New template
            </Button>
          </>
        }
      />

      {loadFailed && (
        <Alert
          tone="danger"
          title="We could not load your templates"
          action={<Button size="sm" variant="outline" onClick={() => { setLoading(true); fetchTemplates(); }}>Try again</Button>}
        >
          Check your connection, then try again.
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-card p-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton width={160} height={14} />
                <Skeleton width="80%" height={12} />
              </div>
              <Skeleton width={72} height={20} variant="rounded" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 && !loadFailed ? (
        <div className="rounded-2xl bg-card">
          <EmptyState
            icon={FileText}
            title="No templates yet"
            description="Pull in the ones you already have at Meta, or write a new one."
            actionLabel={isSyncing ? 'Updating' : 'Sync from Meta'}
            onAction={handleSyncMeta}
          />
        </div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-7">
            <SearchField value={query} onValueChange={setQuery} placeholder="Search templates" />
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              {STATUS_CHIPS.map((c) => (
                <Chip key={c.key} selected={status === c.key} count={counts.status[c.key]} onClick={() => setStatus(c.key)}>
                  {c.label}
                </Chip>
              ))}
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              {CATEGORY_CHIPS.map((c) => (
                <Chip key={c.key} selected={category === c.key} count={counts.category[c.key]} onClick={() => setCategory(c.key)}>
                  {c.label}
                </Chip>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="rounded-2xl bg-card">
                <EmptyState
                  variant="compact"
                  icon={FileText}
                  title="Nothing matches"
                  description="Try a different word or clear the filters."
                  actionLabel="Clear filters"
                  onAction={() => { setQuery(''); setStatus('ALL'); setCategory('ALL'); }}
                />
              </div>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
                {visible.map((t) => {
                  const info = statusInfo(t.status);
                  return (
                    <div key={t.id}>
                      <ListRow
                        title={plainName(t.name)}
                        subtitle={firstLine(bodyTextOf(t)) || 'No message text'}
                        meta={<Badge variant={info.variant}>{info.label}</Badge>}
                        trailing={<span>{categoryLabel(t.category)} · {t.language}</span>}
                        active={!isMobile && selected?.id === t.id}
                        onClick={() => open(t)}
                      />
                      {info.key === 'REJECTED' && (
                        <div className="px-4 pb-3">
                          <Alert tone="danger" className="p-3 text-xs">{rejectionSentence(t.rejectedReason)}</Alert>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-24 rounded-2xl bg-card p-5">
              {selected ? (
                <>
                  <h2 className="mb-3 text-lg font-semibold text-foreground">{plainName(selected.name)}</h2>
                  {details(selected)}
                </>
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">Pick a template to see how it looks.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isMobile && selected && (
        <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title={plainName(selected.name)}>
          {details(selected)}
        </BottomSheet>
      )}

      <TemplateBuilderModal key={builderKey} initial={prefill} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={fetchTemplates} />
      <SendTestModal isOpen={!!testTemplate} template={testTemplate} onClose={() => setTestTemplate(null)} />
    </div>
  );
}
