'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Tag as TagIcon, Users } from 'lucide-react';

interface GroupTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: any[];
  tags: any[];
  onRefresh: () => void;
}

export function GroupTagModal({ isOpen, onClose, groups, tags, onRefresh }: GroupTagModalProps) {
  const [activeTab, setActiveTab] = useState<'GROUPS' | 'TAGS'>('GROUPS');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#10B981');

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          color: newGroupColor,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create group');

      setNewGroupName('');
      setNewGroupDesc('');
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group? Contacts will not be deleted.')) return;
    try {
      await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch {}
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName,
          color: newTagColor,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create tag');

      setNewTagName('');
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      await fetch(`/api/tags?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              {activeTab === 'GROUPS' ? <Users className="w-4 h-4" /> : <TagIcon className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manage Audience Categorization</h3>
              <p className="text-xs text-slate-500">Configure static groups and tag taxonomies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button
            onClick={() => { setActiveTab('GROUPS'); setError(null); }}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'GROUPS'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contact Groups ({groups.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('TAGS'); setError(null); }}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'TAGS'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TagIcon className="w-3.5 h-3.5" />
            <span>Tags ({tags.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {activeTab === 'GROUPS' ? (
            <div className="space-y-4">
              {/* Add Group Form */}
              <form onSubmit={handleCreateGroup} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700">Create New Group</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Group Name (e.g. VIP Clients)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                      className="w-9 h-8 p-1 rounded-lg border border-slate-300 bg-white cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Group</span>
                </button>
              </form>

              {/* Group List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Existing Groups</span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {groups.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-500">No groups created yet</p>
                  ) : (
                    groups.map((g) => (
                      <div key={g.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{g.name}</p>
                            {g.description && <p className="text-[11px] text-slate-500">{g.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
                            {g._count?.contacts || 0} contacts
                          </span>
                          <button
                            onClick={() => handleDeleteGroup(g.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Tag Form */}
              <form onSubmit={handleCreateTag} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700">Create New Tag</span>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-9 h-8 p-1 rounded-lg border border-slate-300 bg-white cursor-pointer"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Tag name (e.g. #high-intent or #wholesale)"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-1.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Tag List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Existing Tags</span>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {tags.length === 0 ? (
                    <p className="text-xs text-slate-500">No tags created yet</p>
                  ) : (
                    tags.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border shadow-sm"
                        style={{ borderColor: t.color, color: t.color }}
                      >
                        <span>{t.name}</span>
                        <span className="text-[10px] text-slate-400">({t._count?.contacts || 0})</span>
                        <button
                          onClick={() => handleDeleteTag(t.id)}
                          className="hover:opacity-75 text-slate-400 hover:text-red-500 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
