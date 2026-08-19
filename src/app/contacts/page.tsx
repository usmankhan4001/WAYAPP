'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  MessageSquare,
} from 'lucide-react';
import { CsvImportModal } from '@/components/contacts/CsvImportModal';
import { GroupTagModal } from '@/components/contacts/GroupTagModal';
import { ContactFormModal } from '@/components/contacts/ContactFormModal';
import { InfoTooltip, Tooltip } from '@/components/ui/Tooltip';

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contacts & Audience Groups</h1>
            <InfoTooltip content="Manage individual customer records, normalized E.164 phone numbers, static list groups, and tag taxonomies." />
          </div>
          <p className="text-xs text-slate-500">
            Categorize your audience into static groups, tags, and dynamic attributes
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Tooltip content="Download a sample CSV file template formatted with phone numbers, names, email, and attributes.">
            <button
              onClick={downloadSampleCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV Template</span>
            </button>
          </Tooltip>

          <Tooltip content="Create and manage custom static groups (e.g. VIP Clients, Retail) and tag taxonomies.">
            <button
              onClick={() => setIsGroupTagOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
            >
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>Manage Groups & Tags</span>
            </button>
          </Tooltip>

          <Tooltip content="Upload CSV file to import contacts in bulk, auto-detect columns, and assign to groups.">
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import CSV</span>
            </button>
          </Tooltip>

          <Tooltip content="Add an individual contact with custom attributes and group assignments.">
            <button
              onClick={() => {
                setEditingContact(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone (+971...), or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Group Filter */}
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
          >
            <option value="ALL">All Groups ({groups.length})</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>Group: {g.name}</option>
            ))}
          </select>

          {/* Tag Filter */}
          <select
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
          >
            <option value="ALL">All Tags ({tags.length})</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No contacts in database</h3>
            <p className="text-xs text-slate-500">
              Upload a customer CSV file or add your first WhatsApp recipient.
            </p>
            <button
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Contacts CSV</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Phone Number (E.164)</th>
                  <th className="py-3 px-4">Assigned Groups</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Custom Attributes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {contacts.map((c) => {
                  const contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
                  let customAttrs: any = {};
                  try {
                    customAttrs = c.customAttributes ? JSON.parse(c.customAttributes) : {};
                  } catch {}

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{contactName}</p>
                        {c.email && <p className="text-[11px] text-slate-400">{c.email}</p>}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {c.phoneNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {c.groups?.length > 0 ? (
                            c.groups.map((g: any) => (
                              <span
                                key={g.groupId}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200"
                              >
                                {g.group?.name}
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
                                key={t.tagId}
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {t.tag?.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {customAttrs.qualificationStatus === 'COMPLETED' || customAttrs.leadTemperature ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  customAttrs.leadTemperature === 'HOT'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : customAttrs.leadTemperature === 'WARM'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {customAttrs.leadTemperature === 'HOT' && '🔥 HOT '}
                                {customAttrs.leadTemperature === 'WARM' && '🟡 WARM '}
                                {customAttrs.leadTemperature === 'COLD' && '🔵 COLD '}
                                ({customAttrs.leadScore || 0} pts)
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-600 space-y-0.5">
                              {customAttrs.businessType && (
                                <p><span className="font-semibold text-slate-700">Type:</span> {customAttrs.businessType}</p>
                              )}
                              {customAttrs.country && (
                                <p><span className="font-semibold text-slate-700">Country:</span> {customAttrs.country}</p>
                              )}
                              {customAttrs.goal && (
                                <p><span className="font-semibold text-slate-700">Goal:</span> {customAttrs.goal}</p>
                              )}
                              {customAttrs.timeline && (
                                <p><span className="font-semibold text-slate-700">Timeline:</span> {customAttrs.timeline}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            {Object.keys(customAttrs).length > 0 ? (
                              Object.keys(customAttrs).slice(0, 3).map((k) => (
                                <span key={k} className="inline-block mr-2">
                                  <strong>{k}:</strong> {String(customAttrs[k])}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">No attributes</span>
                            )}
                          </div>
                        )}
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
                            title="Chat in Team Inbox"
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
        )}
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        groups={groups}
        tags={tags}
        onImported={() => {
          fetchContacts();
          fetchGroupsAndTags();
        }}
      />

      {/* Group & Tag Modal */}
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

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingContact(null);
        }}
        groups={groups}
        tags={tags}
        contactToEdit={editingContact}
        onSaved={fetchContacts}
      />
    </div>
  );
}
