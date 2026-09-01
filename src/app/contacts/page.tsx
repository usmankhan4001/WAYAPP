'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  Tag as TagIcon,
  Trash2,
  Edit2,
  Download,
  Kanban,
  Table as TableIcon,
  MessageSquare,
  CheckCircle2,
  XCircle,
  FolderPlus,
  X,
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { LEAD_STAGES, getLeadStage } from '@/lib/constants/lead-stages';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { CsvImportModal } from '@/components/contacts/CsvImportModal';
import { GroupTagModal } from '@/components/contacts/GroupTagModal';
import { ContactFormModal } from '@/components/contacts/ContactFormModal';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/filter-tabs';
import { Stat, StatGrid } from '@/components/ui/stat';
import { Button } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

const selectClass =
  'h-9 rounded-lg border border-input bg-transparent px-3 text-xs font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export default function ContactsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const [contacts, setContacts] = useState<AnyRecord[]>([]);
  const [groups, setGroups] = useState<AnyRecord[]>([]);
  const [tags, setTags] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');
  const [selectedTagId, setSelectedTagId] = useState('ALL');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGroupTagOpen, setIsGroupTagOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<AnyRecord | null>(null);

  const downloadSampleCsv = () => {
    const csvContent =
      'phoneNumber,firstName,lastName,email,company,city,tags\n' +
      '+971501234567,Ahmed,Al-Maktoum,ahmed@example.com,Dubai Holdings,Dubai,"VIP, Premium"\n' +
      '+966501234567,Sara,Al-Saud,sara@example.com,Riyadh Capital,Riyadh,"Lead, Retail"\n' +
      '+15550192834,John,Smith,john.smith@example.com,Acme Corp,New York,"VIP, Partner"\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'wayapp_contacts_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchContacts = () => {
    let url = `/api/contacts?search=${encodeURIComponent(search)}`;
    if (selectedGroupId !== 'ALL') url += `&groupId=${selectedGroupId}`;
    if (selectedTagId !== 'ALL') url += `&tagId=${selectedTagId}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedGroupId, selectedTagId]);

  const allSelected = useMemo(
    () => contacts.length > 0 && contacts.every((c) => selectedIds.includes(c.id)),
    [contacts, selectedIds]
  );
  const isIndeterminate = selectedIds.length > 0 && !allSelected;

  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : contacts.map((c) => c.id));
  const toggleSelectRow = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleDeleteContact = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this contact?',
      description: 'The contact and their conversation history will be removed.',
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      fetchContacts();
    } catch {
      /* noop */
    }
  };

  const handleUpdateStage = async (contactId: string, newStage: string) => {
    try {
      const res = await fetch('/api/chat/contact-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, leadStage: newStage }),
      });
      if (res.ok) fetchContacts();
    } catch {
      /* noop */
    }
  };

  const totalContactsCount = contacts.length;
  const activePipelineDeals = contacts.filter((c) => c.leadStage && c.leadStage !== 'LOST').length;
  const totalPipelineValue = contacts
    .filter((c) => c.leadStage && c.leadStage !== 'LOST')
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const totalWonRevenue = contacts
    .filter((c) => c.leadStage === 'WON')
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);

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
        toast.error('Bulk action failed');
      }
    } catch (err) {
      toast.error('Network error', err instanceof Error ? err.message : undefined);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.length} contact${selectedIds.length > 1 ? 's' : ''}?`,
      description: 'Their conversation history will also be removed. This cannot be undone.',
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
        setSelectedIds([]);
        fetchContacts();
      } else {
        toast.error(data.error || 'Failed to delete contacts');
      }
    } catch (err) {
      toast.error('Network error', err instanceof Error ? err.message : undefined);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const Chips = ({ items, tone }: { items: AnyRecord[]; tone: 'group' | 'tag' }) =>
    items?.length ? (
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <Badge
            key={it.groupId || it.tagId || it.id}
            variant={tone === 'tag' ? 'info' : 'secondary'}
            className="text-[0.625rem]"
          >
            {it.group?.name || it.tag?.name || it.name}
          </Badge>
        ))}
      </div>
    ) : (
      <span className="text-[0.6875rem] text-muted-foreground">-</span>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Contacts &amp; audience groups
            <InfoTooltip content="Customer records, E.164 phone numbers, static groups and tag taxonomies with bulk editing." />
          </span>
        }
        description="Categorize your audience into pipeline stages, static groups and tags."
        actions={
          <>
            <SegmentedControl
              options={[
                { value: 'table', label: <span className="inline-flex items-center gap-1.5"><TableIcon className="size-3.5" />Table</span> },
                { value: 'kanban', label: <span className="inline-flex items-center gap-1.5"><Kanban className="size-3.5" />Pipeline</span> },
              ]}
              value={viewMode}
              onValueChange={(v) => setViewMode(v as 'table' | 'kanban')}
            />
            <Tooltip content="Download a sample CSV template.">
              <Button variant="outline" size="sm" onClick={downloadSampleCsv}>
                <Download />
                <span className="hidden md:inline">CSV template</span>
              </Button>
            </Tooltip>
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
              <Upload />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsGroupTagOpen(true)}>
              <TagIcon />
              Groups &amp; tags
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingContact(null);
                setIsFormOpen(true);
              }}
            >
              <UserPlus />
              Add contact
            </Button>
          </>
        }
      />

      <StatGrid>
        <Stat label="Total contacts" value={totalContactsCount.toLocaleString()} hint="Active audience directory" icon={<Users />} />
        <Stat label="Active deals" value={activePipelineDeals} hint="Deals in pipeline stages" />
        <Stat label="Pipeline est. value" value={`$${totalPipelineValue.toLocaleString()}`} hint="Weighted pipeline forecast" />
        <Stat
          label="Closed won revenue"
          value={`$${totalWonRevenue.toLocaleString()}`}
          hint="Total closed deals"
          className="bg-success-subtle text-success-subtle-foreground ring-success/20"
        />
      </StatGrid>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className={selectClass}>
            <option value="ALL">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g._count?.contacts || 0})
              </option>
            ))}
          </select>
          <select value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)} className={selectClass}>
            <option value="ALL">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t._count?.contacts || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-foreground px-4 py-3 text-background">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
              {selectedIds.length} selected
            </span>
            <span className="hidden text-xs opacity-70 sm:inline">Bulk actions:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="secondary" size="sm" disabled={isBulkOperating} />}
              >
                <FolderPlus />
                Assign group
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-56 w-48 overflow-y-auto">
                <DropdownMenuLabel>Select group</DropdownMenuLabel>
                {groups.length === 0 ? (
                  <DropdownMenuItem disabled>No groups available</DropdownMenuItem>
                ) : (
                  groups.map((g) => (
                    <DropdownMenuItem key={g.id} onClick={() => bulkPatch({ addGroupId: g.id }, `Group assigned to ${selectedIds.length} contact(s)`)}>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="truncate">{g.name}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="secondary" size="sm" disabled={isBulkOperating} />}>
                <TagIcon />
                Assign tag
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-56 w-48 overflow-y-auto">
                <DropdownMenuLabel>Select tag</DropdownMenuLabel>
                {tags.length === 0 ? (
                  <DropdownMenuItem disabled>No tags available</DropdownMenuItem>
                ) : (
                  tags.map((t) => (
                    <DropdownMenuItem key={t.id} onClick={() => bulkPatch({ addTagId: t.id }, `Tag assigned to ${selectedIds.length} contact(s)`)}>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="truncate">{t.name}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="secondary" size="sm" disabled={isBulkOperating} onClick={() => bulkPatch({ status: 'ACTIVE' }, 'Marked active')}>
              <CheckCircle2 className="text-success" />
              Set active
            </Button>
            <Button variant="secondary" size="sm" disabled={isBulkOperating} onClick={() => bulkPatch({ status: 'UNSUBSCRIBED' }, 'Marked unsubscribed')}>
              <XCircle className="text-warning" />
              Opt out
            </Button>
            <Button variant="destructive" size="sm" disabled={isBulkOperating} onClick={handleBulkDelete}>
              {isBulkOperating ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete ({selectedIds.length})
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setSelectedIds([])} title="Clear selection">
              <X />
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 gap-3.5 overflow-x-auto pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {LEAD_STAGES.map((stage) => {
            const stageContacts = contacts.filter((c) => (c.leadStage || 'NEW_LEAD') === stage.id);
            const stageTotalVal = stageContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
            return (
              <div key={stage.id} className="flex min-w-[220px] flex-col gap-2.5 rounded-xl bg-muted/60 p-3 ring-1 ring-foreground/10">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge tone={stage.tone}>{stage.label}</StatusBadge>
                    <span className="font-mono text-xs font-bold text-muted-foreground">{stageContacts.length}</span>
                  </div>
                  {stageTotalVal > 0 && (
                    <span className="font-mono text-[0.625rem] font-bold text-muted-foreground">${stageTotalVal.toLocaleString()}</span>
                  )}
                </div>

                <div className="max-h-[600px] flex-1 space-y-2 overflow-y-auto">
                  {stageContacts.map((contact) => (
                    <div key={contact.id} className="space-y-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h4 className="truncate text-xs font-semibold text-foreground">
                            {contact.firstName ? `${contact.firstName} ${contact.lastName || ''}`.trim() : contact.phoneNumber}
                          </h4>
                          <p className="truncate font-mono text-[0.6875rem] text-muted-foreground">{contact.phoneNumber}</p>
                        </div>
                        {contact.dealValue > 0 && (
                          <Badge variant="success" className="shrink-0 font-mono text-[0.625rem]">
                            ${contact.dealValue}
                          </Badge>
                        )}
                      </div>

                      {(contact.company || contact.city) && (
                        <div className="flex items-center gap-2 text-[0.625rem] text-muted-foreground">
                          {contact.company && <span className="truncate">🏢 {contact.company}</span>}
                          {contact.city && <span className="truncate">📍 {contact.city}</span>}
                        </div>
                      )}

                      {contact.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((t: AnyRecord) => (
                            <Badge key={t.tagId || t.tag?.id} variant="info" className="text-[0.5625rem]">
                              {t.tag?.name || t.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-border pt-1.5 text-[0.625rem]">
                        <button
                          onClick={() => router.push(`/inbox?contactId=${contact.id}`)}
                          className="flex items-center gap-1 font-semibold text-primary hover:text-primary/80"
                        >
                          <MessageSquare className="size-3" />
                          <span>Chat</span>
                        </button>
                        <select
                          value={contact.leadStage || 'NEW_LEAD'}
                          onChange={(e) => handleUpdateStage(contact.id, e.target.value)}
                          className="rounded border border-input bg-transparent px-1 py-0.5 text-[0.625rem] font-semibold outline-none"
                        >
                          {LEAD_STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {stageContacts.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-[0.6875rem] text-muted-foreground">
                      No contacts in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts in database"
              description="Upload a customer CSV file or add your first WhatsApp recipient."
              actionLabel="Import contacts CSV"
              onAction={() => setIsImportOpen(true)}
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-[0.625rem] font-semibold uppercase text-muted-foreground">
                      <th className="w-10 px-3 py-3 text-center">
                        <Checkbox
                          checked={allSelected}
                          indeterminate={isIndeterminate}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Phone (E.164)</th>
                      <th className="px-4 py-3">Lead stage</th>
                      <th className="px-4 py-3">Groups</th>
                      <th className="px-4 py-3">Tags</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {contacts.map((c) => {
                      const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
                      const isSelected = selectedIds.includes(c.id);
                      const stage = getLeadStage(c.leadStage);
                      return (
                        <tr key={c.id} className={cn('transition-colors', isSelected ? 'bg-brand-subtle' : 'hover:bg-accent')}>
                          <td className="px-3 py-3 text-center">
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectRow(c.id)} aria-label={`Select ${contactName}`} />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{contactName}</p>
                            {c.email && <p className="text-[0.6875rem] text-muted-foreground">{c.email}</p>}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium">{c.phoneNumber}</td>
                          <td className="px-4 py-3">
                            <StatusBadge tone={stage.tone}>{stage.label}</StatusBadge>
                          </td>
                          <td className="px-4 py-3">
                            <Chips items={c.groups} tone="group" />
                          </td>
                          <td className="px-4 py-3">
                            <Chips items={c.tags} tone="tag" />
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={c.status === 'ACTIVE' ? 'success' : 'secondary'}>{c.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/inbox?contactId=${c.id}`)} title="Direct chat">
                                <MessageSquare className="text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setEditingContact(c);
                                  setIsFormOpen(true);
                                }}
                                title="Edit contact"
                              >
                                <Edit2 />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteContact(c.id)} title="Delete contact">
                                <Trash2 />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-border md:hidden">
                {contacts.map((c) => {
                  const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
                  const isSelected = selectedIds.includes(c.id);
                  const stage = getLeadStage(c.leadStage);
                  return (
                    <div key={c.id} className={cn('space-y-2.5 p-3.5 transition-colors', isSelected && 'bg-brand-subtle')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectRow(c.id)} aria-label={`Select ${contactName}`} />
                          <div className="min-w-0">
                            <h4 className="truncate text-xs font-semibold text-foreground">{contactName}</h4>
                            <p className="font-mono text-[0.6875rem] text-muted-foreground">{c.phoneNumber}</p>
                          </div>
                        </div>
                        <StatusBadge tone={stage.tone} className="shrink-0">
                          {stage.label}
                        </StatusBadge>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chips items={c.groups} tone="group" />
                        <Chips items={c.tags} tone="tag" />
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-1">
                        <Badge variant={c.status === 'ACTIVE' ? 'success' : 'secondary'}>{c.status}</Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="wa" size="sm" onClick={() => router.push(`/inbox?contactId=${c.id}`)}>
                            <MessageSquare />
                            Chat
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditingContact(c);
                              setIsFormOpen(true);
                            }}
                          >
                            <Edit2 />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteContact(c.id)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
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
      />
    </div>
  );
}
