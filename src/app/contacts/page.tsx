'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  Tag,
  Trash2,
  Edit2,
  Filter,
  Download,
  Kanban,
  Table,
  DollarSign,
  MessageSquare,
  Building,
  MapPin,
  TrendingUp,
  Award,
  CheckSquare,
  Square,
  MinusSquare,
  CheckCircle2,
  XCircle,
  FolderPlus,
  Tag as TagIcon,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { CsvImportModal } from '@/components/contacts/CsvImportModal';
import { GroupTagModal } from '@/components/contacts/GroupTagModal';
import { ContactFormModal } from '@/components/contacts/ContactFormModal';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const LEAD_STAGES = [
  { id: 'NEW_LEAD', label: 'New Lead', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'QUALIFIED', label: 'Qualified', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'PROPOSAL_SENT', label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'WON', label: 'Deal Won', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'LOST', label: 'Deal Lost', color: 'bg-rose-100 text-rose-800 border-rose-200' },
];

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [selectedTagId, setSelectedTagId] = useState<string>('ALL');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGroupTagOpen, setIsGroupTagOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);

  // Bulk Action Menus
  const [bulkGroupMenuOpen, setBulkGroupMenuOpen] = useState(false);
  const [bulkTagMenuOpen, setBulkTagMenuOpen] = useState(false);

  const downloadSampleCsv = () => {
    const csvContent =
      'phoneNumber,firstName,lastName,email,company,city,tags\n' +
      '+971501234567,Ahmed,Al-Maktoum,ahmed@example.com,Dubai Holdings,Dubai,"VIP, Premium"\n' +
      '+966501234567,Sara,Al-Saud,sara@example.com,Riyadh Capital,Riyadh,"Lead, Retail"\n' +
      '+974501234567,Tariq,Mansoor,tariq@example.com,Doha Trading,Doha,Customer\n' +
      '+15550192834,John,Smith,john.smith@example.com,Acme Corp,New York,"VIP, Partner"\n' +
      '+447700900077,Emma,Watson,emma.watson@example.com,London Tech,London,Lead\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'wayapp_contacts_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
  }, [search, selectedGroupId, selectedTagId]);

  // Selection helpers
  const allSelected = useMemo(() => {
    return contacts.length > 0 && contacts.every((c) => selectedIds.includes(c.id));
  }, [contacts, selectedIds]);

  const isIndeterminate = useMemo(() => {
    return selectedIds.length > 0 && !allSelected;
  }, [selectedIds, allSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      fetchContacts();
    } catch {}
  };

  const handleUpdateStage = async (contactId: string, newStage: string) => {
    try {
      const res = await fetch('/api/chat/contact-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, leadStage: newStage }),
      });
      if (res.ok) fetchContacts();
    } catch {}
  };

  // Pipeline Metrics Calculation
  const totalContactsCount = contacts.length;
  const activePipelineDeals = contacts.filter((c) => c.leadStage && c.leadStage !== 'LOST').length;
  const totalPipelineValue = contacts
    .filter((c) => c.leadStage && c.leadStage !== 'LOST')
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const totalWonRevenue = contacts
    .filter((c) => c.leadStage === 'WON')
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);

  // Bulk Operations
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete ${selectedIds.length} selected contact(s)? This will also remove their conversation history.`
      )
    )
      return;

    setIsBulkOperating(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkMessage(`Successfully deleted ${selectedIds.length} contacts.`);
        setSelectedIds([]);
        fetchContacts();
        setTimeout(() => setBulkMessage(null), 4000);
      } else {
        alert(data.error || 'Failed to delete contacts');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkAssignGroup = async (groupId: string) => {
    if (selectedIds.length === 0 || !groupId) return;
    setIsBulkOperating(true);
    setBulkGroupMenuOpen(false);
    try {
      const res = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          addGroupId: groupId,
        }),
      });
      if (res.ok) {
        setBulkMessage(`Assigned group to ${selectedIds.length} contact(s).`);
        fetchContacts();
        setTimeout(() => setBulkMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkAssignTag = async (tagId: string) => {
    if (selectedIds.length === 0 || !tagId) return;
    setIsBulkOperating(true);
    setBulkTagMenuOpen(false);
    try {
      const res = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          addTagId: tagId,
        }),
      });
      if (res.ok) {
        setBulkMessage(`Assigned tag to ${selectedIds.length} contact(s).`);
        fetchContacts();
        setTimeout(() => setBulkMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: 'ACTIVE' | 'UNSUBSCRIBED') => {
    if (selectedIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setBulkMessage(`Updated status to ${newStatus} for ${selectedIds.length} contact(s).`);
        fetchContacts();
        setTimeout(() => setBulkMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkOperating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contacts & Audience Groups</h1>
            <InfoTooltip content="Manage individual customer records, normalized E.164 phone numbers, static list groups, and tag taxonomies with bulk editing & delete options." />
          </div>
          <p className="text-xs text-slate-500">
            Categorize your audience into visual pipeline stages, static groups, and tag taxonomies
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-200 p-0.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pipeline Board</span>
            </button>
          </div>

          <Tooltip content="Download a sample CSV file template formatted with phone numbers, names, email, and attributes.">
            <button
              onClick={downloadSampleCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">CSV Template</span>
            </button>
          </Tooltip>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setIsGroupTagOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
          >
            <Tag className="w-3.5 h-3.5 text-purple-600" />
            <span>Groups & Tags</span>
          </button>

          <button
            onClick={() => {
              setEditingContact(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* CRM Pipeline KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Contacts</span>
          <p className="text-2xl font-black text-slate-900 font-mono">{totalContactsCount.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">Active audience directory</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Deals</span>
          <p className="text-2xl font-black text-blue-700 font-mono">{activePipelineDeals}</p>
          <span className="text-[10px] text-slate-500">Deals in pipeline stages</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Est. Value</span>
          <p className="text-2xl font-black text-purple-700 font-mono">${totalPipelineValue.toLocaleString()}</p>
          <span className="text-[10px] text-purple-600 font-semibold">Weighted pipeline forecast</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Closed Won Revenue</span>
          <p className="text-2xl font-black text-emerald-900 font-mono">${totalWonRevenue.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">Total closed deals</span>
        </div>
      </div>

      {/* Bulk Feedback Banner */}
      {bulkMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{bulkMessage}</span>
          </div>
          <button onClick={() => setBulkMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g._count?.contacts || 0})
              </option>
            ))}
          </select>

          <select
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t._count?.contacts || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs">
              {selectedIds.length} Selected
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">Bulk actions for selected contacts:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Assign Group Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setBulkGroupMenuOpen(!bulkGroupMenuOpen);
                  setBulkTagMenuOpen(false);
                }}
                disabled={isBulkOperating}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Assign Group</span>
              </button>

              {bulkGroupMenuOpen && (
                <div className="absolute top-full mt-1.5 left-0 z-30 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 text-slate-800 max-h-48 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">Select Group</div>
                  {groups.length === 0 ? (
                    <p className="px-3 py-1.5 text-xs text-slate-400">No groups available</p>
                  ) : (
                    groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleBulkAssignGroup(g.id)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 flex items-center gap-2 font-medium"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                        <span className="truncate">{g.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Bulk Assign Tag Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setBulkTagMenuOpen(!bulkTagMenuOpen);
                  setBulkGroupMenuOpen(false);
                }}
                disabled={isBulkOperating}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <TagIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Assign Tag</span>
              </button>

              {bulkTagMenuOpen && (
                <div className="absolute top-full mt-1.5 left-0 z-30 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 text-slate-800 max-h-48 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">Select Tag</div>
                  {tags.length === 0 ? (
                    <p className="px-3 py-1.5 text-xs text-slate-400">No tags available</p>
                  ) : (
                    tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleBulkAssignTag(t.id)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 flex items-center gap-2 font-medium"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Bulk Status Update */}
            <button
              type="button"
              onClick={() => handleBulkStatusChange('ACTIVE')}
              disabled={isBulkOperating}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Set selected contacts as Active"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Set Active</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkStatusChange('UNSUBSCRIBED')}
              disabled={isBulkOperating}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Set selected contacts as Unsubscribed"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Opt Out</span>
            </button>

            {/* Bulk Delete Button */}
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isBulkOperating}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              {isBulkOperating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Delete ({selectedIds.length})</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN PIPELINE BOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {LEAD_STAGES.map((stage) => {
            const stageContacts = contacts.filter(
              (c) => (c.leadStage || 'NEW_LEAD') === stage.id
            );
            const stageTotalVal = stageContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);

            return (
              <div
                key={stage.id}
                className="bg-slate-100/70 p-3 rounded-2xl border border-slate-200 flex flex-col space-y-2.5 min-w-[220px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${stage.color}`}>
                      {stage.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {stageContacts.length}
                    </span>
                  </div>
                  {stageTotalVal > 0 && (
                    <span className="text-[10px] font-bold text-slate-600 font-mono">
                      ${stageTotalVal.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Cards Stream */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                  {stageContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 space-y-2 transition-all"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {contact.firstName
                              ? `${contact.firstName} ${contact.lastName || ''}`.trim()
                              : contact.phoneNumber}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono truncate">{contact.phoneNumber}</p>
                        </div>
                        {contact.dealValue > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] font-mono shrink-0">
                            ${contact.dealValue}
                          </span>
                        )}
                      </div>

                      {/* Company & City */}
                      {(contact.company || contact.city) && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          {contact.company && <span className="truncate">🏢 {contact.company}</span>}
                          {contact.city && <span className="truncate">📍 {contact.city}</span>}
                        </div>
                      )}

                      {/* Tags */}
                      {contact.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((t: any) => (
                            <span
                              key={t.tagId || t.tag?.id}
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700"
                            >
                              {t.tag?.name || t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                        <button
                          onClick={() => router.push(`/inbox?contactId=${contact.id}`)}
                          className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>

                        {/* Stage Selector */}
                        <select
                          value={contact.leadStage || 'NEW_LEAD'}
                          onChange={(e) => handleUpdateStage(contact.id, e.target.value)}
                          className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded px-1 py-0.5"
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
                    <div className="p-4 text-center text-slate-400 text-[11px] border border-dashed border-slate-200 rounded-xl">
                      No contacts in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts in database"
              description="Upload a customer CSV file or add your first WhatsApp recipient."
              actionLabel="Import Contacts CSV"
              onAction={() => setIsImportOpen(true)}
            />
          ) : (
            <div>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-slate-400 hover:text-emerald-600 focus:outline-none"
                          title={allSelected ? 'Deselect all' : 'Select all'}
                        >
                          {allSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : isIndeterminate ? (
                            <MinusSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Phone Number (E.164)</th>
                      <th className="py-3 px-4">Lead Stage</th>
                      <th className="py-3 px-4">Assigned Groups</th>
                      <th className="py-3 px-4">Tags</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {contacts.map((c) => {
                      const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
                      const isSelected = selectedIds.includes(c.id);
                      const stageObj = LEAD_STAGES.find((s) => s.id === c.leadStage) || LEAD_STAGES[0];

                      return (
                        <tr
                          key={c.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectRow(c.id)}
                              className="text-slate-400 hover:text-emerald-600 focus:outline-none"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{contactName}</p>
                            {c.email && <p className="text-[11px] text-slate-400">{c.email}</p>}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            {c.phoneNumber}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stageObj.color}`}>
                              {stageObj.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {c.groups?.length > 0 ? (
                                c.groups.map((g: any) => (
                                  <span
                                    key={g.groupId || g.id}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200"
                                  >
                                    {g.group?.name || g.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {c.tags?.length > 0 ? (
                                c.tags.map((t: any) => (
                                  <span
                                    key={t.tagId || t.id}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700"
                                  >
                                    {t.tag?.name || t.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                c.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => router.push(`/inbox?contactId=${c.id}`)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Direct 1-to-1 Chat"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingContact(c);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                title="Edit Contact"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteContact(c.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                                title="Delete Contact"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards Stream */}
              <div className="md:hidden divide-y divide-slate-100">
                {contacts.map((c) => {
                  const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
                  const isSelected = selectedIds.includes(c.id);
                  const stageObj = LEAD_STAGES.find((s) => s.id === c.leadStage) || LEAD_STAGES[0];

                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 space-y-2.5 transition-colors ${
                        isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(c.id)}
                            className="text-slate-400 hover:text-emerald-600 shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate">{contactName}</h4>
                            <p className="text-[11px] font-mono text-slate-500">{c.phoneNumber}</p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${stageObj.color}`}>
                          {stageObj.label}
                        </span>
                      </div>

                      {/* Groups & Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {c.groups?.map((g: any) => (
                          <span
                            key={g.groupId || g.id}
                            className="px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {g.group?.name || g.name}
                          </span>
                        ))}
                        {c.tags?.map((t: any) => (
                          <span
                            key={t.tagId || t.id}
                            className="px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700"
                          >
                            {t.tag?.name || t.name}
                          </span>
                        ))}
                      </div>

                      {/* Mobile Row Action Bar */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {c.status}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => router.push(`/inbox?contactId=${c.id}`)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs inline-flex items-center gap-1 shadow-2xs transition-all"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Chat</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingContact(c);
                              setIsFormOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 p-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(c.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        groups={groups}
        tags={tags}
        onImported={fetchContacts}
      />
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
