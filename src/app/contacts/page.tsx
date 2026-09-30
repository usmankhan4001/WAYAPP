'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Upload,
  Tag as TagIcon,
  Trash2,
  MessageSquare,
  CheckCircle2,
  XCircle,
  FolderPlus,
  X,
  Loader2,
  ListChecks,
  ChevronDown,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { LEAD_STAGES, getLeadStage } from '@/lib/constants/lead-stages';
import {
  contactName,
  countContacts,
  filterContacts,
  formatPhone,
  isOptedOut,
  stageWord,
  type ContactFilter,
} from '@/lib/contacts/present';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { CsvImportModal } from '@/components/contacts/CsvImportModal';
import { GroupTagModal } from '@/components/contacts/GroupTagModal';
import { ContactFormModal } from '@/components/contacts/ContactFormModal';
import { ColorDot } from '@/components/contacts/ColorDot';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/filter-tabs';
import { Stat, StatGrid } from '@/components/ui/stat';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBadge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { SearchField } from '@/components/ui/search-field';
import { ListRow } from '@/components/ui/list-row';
import { UserAvatar } from '@/components/ui/avatar';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/Toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export default function ContactsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const [contacts, setContacts] = useState<AnyRecord[]>([]);
  const [groups, setGroups] = useState<AnyRecord[]>([]);
  const [tags, setTags] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ContactFilter>({ kind: 'all' });
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGroupTagOpen, setIsGroupTagOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<AnyRecord | null>(null);

  const fetchContacts = useCallback(() => {
    let url = `/api/contacts?search=${encodeURIComponent(search)}`;
    if (selectedGroupId !== 'ALL') url += `&groupId=${selectedGroupId}`;
    return fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('load');
        return res.json();
      })
      .then((data) => {
        setContacts(Array.isArray(data) ? data : []);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [search, selectedGroupId]);

  const fetchGroupsAndTags = () => {
    Promise.all([
      fetch('/api/groups').then((res) => res.json()),
      fetch('/api/tags').then((res) => res.json()),
    ])
      .then(([grps, tgs]) => {
        setGroups(Array.isArray(grps) ? grps : []);
        setTags(Array.isArray(tgs) ? tgs : []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchGroupsAndTags();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const counts = useMemo(() => countContacts(contacts), [contacts]);
  const visible = useMemo(() => filterContacts(contacts, filter), [contacts, filter]);

  const isChip = (f: ContactFilter) =>
    f.kind === filter.kind && ('id' in f && 'id' in filter ? f.id === filter.id : true);

  const openContact = (c: AnyRecord | null) => {
    setEditingContact(c);
    setIsFormOpen(true);
  };

  const toggleSelectRow = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const endSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const handleDeleteContact = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this contact?',
      description: 'The contact and their chat history will be removed. This cannot be undone.',
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return false;
    try {
      const res = await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete');
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success('Contact deleted');
      fetchContacts();
      return true;
    } catch {
      toast.error('We could not delete this contact', 'Check your connection and try again.');
      return false;
    }
  };

  const handleUpdateStage = async (contactId: string, newStage: string) => {
    try {
      const res = await fetch('/api/chat/contact-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, leadStage: newStage }),
      });
      if (!res.ok) throw new Error('stage');
      fetchContacts();
    } catch {
      toast.error('We could not change the stage', 'Check your connection and try again.');
    }
  };

  const activeDeals = contacts.filter((c) => c.leadStage && c.leadStage !== 'LOST').length;
  const pipelineValue = contacts
    .filter((c) => c.leadStage && c.leadStage !== 'LOST')
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const wonValue = contacts.filter((c) => c.leadStage === 'WON').reduce((sum, c) => sum + (c.dealValue || 0), 0);

  const bulkPatch = async (body: AnyRecord, successMsg: string) => {
    setIsBulkOperating(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, ...body }),
      });
      if (res.ok) {
        toast.success(successMsg);
        fetchContacts();
      } else {
        toast.error('That did not work', 'Please try again.');
      }
    } catch (err) {
      toast.error('No connection', err instanceof Error ? err.message : undefined);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.length} contact${selectedIds.length > 1 ? 's' : ''}?`,
      description: 'Their chat history will also be removed. This cannot be undone.',
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setIsBulkOperating(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deleted ${selectedIds.length} contacts`);
        endSelectMode();
        fetchContacts();
      } else {
        toast.error(data.error || 'We could not delete those contacts');
      }
    } catch (err) {
      toast.error('No connection', err instanceof Error ? err.message : undefined);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const LabelDots = ({ c }: { c: AnyRecord }) =>
    c.tags?.length ? (
      <span className="flex items-center gap-1" aria-label={c.tags.map((t: AnyRecord) => t.tag?.name).filter(Boolean).join(', ')}>
        {c.tags.slice(0, 4).map((t: AnyRecord) => (
          <ColorDot key={t.tagId || t.tag?.id} color={t.tag?.color} />
        ))}
      </span>
    ) : null;

  const StageMenu = ({ c }: { c: AnyRecord }) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" aria-label={`Change stage for ${contactName(c)}`} />}>
        {stageWord(c.leadStage)}
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
        {LEAD_STAGES.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => handleUpdateStage(c.id, s.id)}>
            {stageWord(s.id)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const hasAnyContacts = contacts.length > 0 || search !== '' || selectedGroupId !== 'ALL';

  return (
    <div className="space-y-4 pb-16 md:space-y-6 md:pb-0">
      <PageHeader
        title="Contacts"
        description="The people you message, with labels and stages to keep track of them."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
              <Upload />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsGroupTagOpen(true)}>
              <TagIcon />
              <span className="hidden sm:inline">Labels and groups</span>
              <span className="sm:hidden">Labels</span>
            </Button>
            <Button size="sm" className="hidden md:inline-flex" onClick={() => openContact(null)}>
              <UserPlus />
              Add contact
            </Button>
          </>
        }
      />

      {!loadError && contacts.length > 0 && (
        <StatGrid>
          <Stat label="People" value={counts.all.toLocaleString()} icon={<Users />} />
          <Stat label="Open deals" value={activeDeals} />
          <Stat label="Deals in progress" value={`$${pipelineValue.toLocaleString()}`} />
          <Stat
            label="Deals won"
            value={`$${wonValue.toLocaleString()}`}
            className="bg-success-subtle text-success-subtle-foreground ring-success/20"
          />
        </StatGrid>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField value={search} onValueChange={setSearch} placeholder="Search name, phone or company" className="sm:max-w-sm sm:flex-1" />
        <div className="flex items-center gap-2">
          <SegmentedControl
            options={[
              { value: 'list', label: 'List' },
              { value: 'pipeline', label: 'Pipeline' },
            ]}
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'list' | 'pipeline')}
          />
          {viewMode === 'list' && contacts.length > 0 && (
            <Button
              variant={selectMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => (selectMode ? endSelectMode() : setSelectMode(true))}
            >
              <ListChecks />
              {selectMode ? 'Done' : 'Select'}
            </Button>
          )}
        </div>
      </div>

      {/* Filter chips: one horizontal row, scrolls on a phone */}
      <div className="-mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filter contacts">
        <Chip selected={filter.kind === 'all'} count={counts.all} onClick={() => setFilter({ kind: 'all' })}>
          All
        </Chip>
        {tags.map((t) => (
          <Chip key={t.id} selected={isChip({ kind: 'label', id: t.id })} count={counts.byLabel[t.id] ?? 0} onClick={() => setFilter({ kind: 'label', id: t.id })}>
            <ColorDot color={t.color} className="size-2" />
            {t.name}
          </Chip>
        ))}
        {LEAD_STAGES.map((s) => (
          <Chip key={s.id} selected={isChip({ kind: 'stage', id: s.id })} count={counts.byStage[s.id] ?? 0} onClick={() => setFilter({ kind: 'stage', id: s.id })}>
            {stageWord(s.id)}
          </Chip>
        ))}
        <Chip selected={filter.kind === 'optedOut'} count={counts.optedOut} onClick={() => setFilter({ kind: 'optedOut' })}>
          Opted out
        </Chip>
      </div>

      {groups.length > 0 && (
        <div className="-mx-3.5 flex items-center gap-2 overflow-x-auto px-3.5 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filter by group">
          <span className="shrink-0 text-sm text-muted-foreground">Groups</span>
          <Chip selected={selectedGroupId === 'ALL'} onClick={() => setSelectedGroupId('ALL')}>
            Everyone
          </Chip>
          {groups.map((g) => (
            <Chip key={g.id} selected={selectedGroupId === g.id} count={g._count?.contacts || 0} onClick={() => setSelectedGroupId(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
      )}

      {/* Bulk actions */}
      {selectMode && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={visible.length > 0 && visible.every((c) => selectedIds.includes(c.id))}
              onCheckedChange={() =>
                setSelectedIds(visible.every((c) => selectedIds.includes(c.id)) ? [] : visible.map((c) => c.id))
              }
              aria-label="Select everyone shown"
            />
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="secondary" size="sm" disabled={isBulkOperating} />}>
                  <FolderPlus />
                  Add to group
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-56 w-48 overflow-y-auto">
                  <DropdownMenuLabel>Choose a group</DropdownMenuLabel>
                  {groups.length === 0 ? (
                    <DropdownMenuItem disabled>No groups yet</DropdownMenuItem>
                  ) : (
                    groups.map((g) => (
                      <DropdownMenuItem key={g.id} onClick={() => bulkPatch({ addGroupId: g.id }, `Added ${selectedIds.length} to ${g.name}`)}>
                        <ColorDot color={g.color} />
                        <span className="truncate">{g.name}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="secondary" size="sm" disabled={isBulkOperating} />}>
                  <TagIcon />
                  Add label
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-56 w-48 overflow-y-auto">
                  <DropdownMenuLabel>Choose a label</DropdownMenuLabel>
                  {tags.length === 0 ? (
                    <DropdownMenuItem disabled>No labels yet</DropdownMenuItem>
                  ) : (
                    tags.map((t) => (
                      <DropdownMenuItem key={t.id} onClick={() => bulkPatch({ addTagId: t.id }, `Label added to ${selectedIds.length} contact(s)`)}>
                        <ColorDot color={t.color} />
                        <span className="truncate">{t.name}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="secondary" size="sm" disabled={isBulkOperating} onClick={() => bulkPatch({ status: 'ACTIVE' }, 'They can receive messages again')}>
                <CheckCircle2 className="text-success" />
                Can message
              </Button>
              <Button variant="secondary" size="sm" disabled={isBulkOperating} onClick={() => bulkPatch({ status: 'UNSUBSCRIBED' }, 'Marked as opted out')}>
                <XCircle className="text-warning" />
                Opted out
              </Button>
              <Button variant="destructive" size="sm" disabled={isBulkOperating} onClick={handleBulkDelete}>
                {isBulkOperating ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Delete
              </Button>
              <IconButton label="Clear selection" size="sm" onClick={() => setSelectedIds([])}>
                <X />
              </IconButton>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="flex-1 space-y-2">
                <Skeleton width="45%" />
                <Skeleton width="30%" />
              </div>
              <Skeleton variant="rounded" width={64} height={24} />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <Alert
          tone="danger"
          title="We could not load your contacts"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLoading(true);
                fetchContacts();
              }}
            >
              Try again
            </Button>
          }
        >
          Check your internet connection, then try again.
        </Alert>
      ) : !hasAnyContacts ? (
        <div className="rounded-2xl bg-card ring-1 ring-foreground/10">
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add someone you want to message, or import a list from a spreadsheet."
            actionLabel="Add contact"
            onAction={() => openContact(null)}
          />
          <div className="flex justify-center pb-10">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload />
              Import
            </Button>
          </div>
        </div>
      ) : viewMode === 'pipeline' ? (
        <div className="-mx-3.5 flex snap-x gap-3 overflow-x-auto px-3.5 pb-4 sm:mx-0 sm:px-0">
          {LEAD_STAGES.map((stage) => {
            const stageContacts = visible.filter((c) => (c.leadStage || 'NEW_LEAD') === stage.id);
            const stageValue = stageContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
            return (
              <div key={stage.id} className="flex w-[80vw] max-w-72 shrink-0 snap-start flex-col gap-2.5 rounded-2xl bg-muted/60 p-3 ring-1 ring-foreground/10 md:w-64">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={stage.tone}>{stageWord(stage.id)}</StatusBadge>
                    <span className="text-sm font-semibold text-muted-foreground">{stageContacts.length}</span>
                  </div>
                  {stageValue > 0 && <span className="text-xs font-semibold text-muted-foreground">${stageValue.toLocaleString()}</span>}
                </div>

                <div className="max-h-[70vh] flex-1 space-y-2 overflow-y-auto">
                  {stageContacts.map((c) => (
                    <div key={c.id} className="space-y-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                      <button type="button" onClick={() => openContact(c)} className="block w-full text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                        <span className="block truncate text-base font-medium text-foreground">{contactName(c)}</span>
                        <span className="block truncate text-sm text-muted-foreground">{formatPhone(c.phoneNumber)}</span>
                      </button>
                      <div className="flex items-center justify-between gap-2">
                        <LabelDots c={c} />
                        {c.dealValue > 0 && <span className="text-sm font-medium text-success">${c.dealValue}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/inbox?contactId=${c.id}`)}>
                          <MessageSquare />
                          Open chat
                        </Button>
                        <StageMenu c={c} />
                      </div>
                    </div>
                  ))}
                  {stageContacts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                      Nobody at this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl bg-card ring-1 ring-foreground/10">
          <EmptyState
            icon={Users}
            variant="compact"
            title="No one matches"
            description="Try a different search or filter."
            actionLabel="Show everyone"
            onAction={() => {
              setSearch('');
              setFilter({ kind: 'all' });
              setSelectedGroupId('ALL');
            }}
          />
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {visible.map((c) => {
            const name = contactName(c);
            const selected = selectedIds.includes(c.id);
            const stage = getLeadStage(c.leadStage);
            return (
              <div key={c.id} className={cn('flex items-center', selected && 'bg-brand-subtle')}>
                {selectMode && (
                  <span className="pl-4">
                    <Checkbox checked={selected} onCheckedChange={() => toggleSelectRow(c.id)} aria-label={`Select ${name}`} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <ListRow
                    leading={<UserAvatar name={c.firstName ? name : c.phoneNumber} />}
                    title={name}
                    subtitle={
                      <span className="inline-flex items-center gap-2">
                        {formatPhone(c.phoneNumber)}
                        {isOptedOut(c) && <span className="text-warning">Opted out</span>}
                      </span>
                    }
                    meta={<LabelDots c={c} />}
                    trailing={<StatusBadge tone={stage.tone}>{stageWord(c.leadStage)}</StatusBadge>}
                    onClick={() => (selectMode ? toggleSelectRow(c.id) : openContact(c))}
                  />
                </div>
                {!selectMode && (
                  <IconButton label={`Open chat with ${name}`} className="mr-2 hidden sm:inline-flex" onClick={() => router.push(`/inbox?contactId=${c.id}`)}>
                    <MessageSquare className="text-primary" />
                  </IconButton>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Round Add button on phones */}
      {!selectMode && (
        <button
          type="button"
          aria-label="Add contact"
          onClick={() => openContact(null)}
          className="fixed right-4 bottom-20 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 md:hidden"
        >
          <UserPlus className="size-6" />
        </button>
      )}

      <CsvImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} groups={groups} tags={tags} onImported={fetchContacts} />
      <GroupTagModal
        isOpen={isGroupTagOpen}
        onClose={() => setIsGroupTagOpen(false)}
        groups={groups}
        tags={tags}
        onRefresh={() => {
          fetchGroupsAndTags();
          fetchContacts();
        }}
      />
      <ContactFormModal
        isOpen={isFormOpen}
        contactToEdit={editingContact}
        groups={groups}
        tags={tags}
        onClose={() => setIsFormOpen(false)}
        onSaved={fetchContacts}
        onDelete={async (id) => {
          if (await handleDeleteContact(id)) setIsFormOpen(false);
        }}
      />
    </div>
  );
}
