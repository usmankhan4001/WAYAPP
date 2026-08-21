'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { CsvImportModal } from '@/components/contacts/CsvImportModal';
import { GroupTagModal } from '@/components/contacts/GroupTagModal';
import { ContactFormModal } from '@/components/contacts/ContactFormModal';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';

const LEAD_STAGES = [
  { id: 'NEW_LEAD', label: 'New Lead', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'QUALIFIED', label: 'Qualified', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'PROPOSAL_SENT', label: 'Proposal Sent', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'WON', label: 'Deal Won', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'LOST', label: 'Deal Lost', color: 'bg-rose-100 text-rose-800 border-rose-200' },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('ALL');
  const [selectedTagId, setSelectedTagId] = useState<string>('ALL');

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGroupTagOpen, setIsGroupTagOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);

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

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contacts & Sales CRM</h1>
            <InfoTooltip content="Manage customer records, track visual pipeline stages, and organize tags." />
          </div>
          <p className="text-xs text-slate-500">
            Categorize your audience into visual pipeline stages, static groups, and tag taxonomies
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-200 p-0.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pipeline Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table View</span>
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

      {/* Loading Spinner */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
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
                              key={t.tagId}
                              className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-700"
                            >
                              {t.tag?.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                        <Link
                          href="/inbox"
                          className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </Link>

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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="p-3.5">Name & Phone</th>
                <th className="p-3.5">Company & City</th>
                <th className="p-3.5">Lead Stage</th>
                <th className="p-3.5">Deal Value</th>
                <th className="p-3.5">Tags</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c) => {
                const stageObj = LEAD_STAGES.find((s) => s.id === c.leadStage) || LEAD_STAGES[0];

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">
                        {c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : 'Unnamed Contact'}
                      </div>
                      <div className="font-mono text-slate-500 text-[11px]">{c.phoneNumber}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-slate-800">{c.company || '—'}</div>
                      <div className="text-slate-400 text-[11px]">{c.city || ''}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stageObj.color}`}>
                        {stageObj.label}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      {c.dealValue > 0 ? `$${c.dealValue.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.map((t: any) => (
                          <span
                            key={t.tagId}
                            className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700"
                          >
                            {t.tag?.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <Link
                        href="/inbox"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg inline-block"
                        title="Open in Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          setEditingContact(c);
                          setIsFormOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                        title="Edit Contact"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
