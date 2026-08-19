'use client';

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, X, Phone, User, ArrowRight } from 'lucide-react';
import { normalizePhoneNumber } from '@/lib/utils';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: any) => void;
}

export function NewChatModal({ isOpen, onClose, onSelectContact }: NewChatModalProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/api/contacts?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, search]);

  if (!isOpen) return null;

  const handleCreateAndSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: manualPhone.trim(),
          firstName: manualName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create contact');
      }

      onSelectContact(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Start New Conversation</h2>
              <p className="text-[11px] text-slate-500">Pick an existing contact or enter a new number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* Search Existing Contacts */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Existing Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 min-h-[160px] max-h-[240px]">
          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No contacts found matching search
            </div>
          ) : (
            contacts.map((c) => {
              const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectContact(c);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{c.phoneNumber}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
                </div>
              );
            })
          )}
        </div>

        {/* Manual Phone Input Form */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <form onSubmit={handleCreateAndSelect} className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-700">Or Message a New Number:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Phone (e.g. +971501234567)"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <input
                type="text"
                placeholder="Contact Name (optional)"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !manualPhone.trim()}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{creating ? 'Starting...' : 'Start Chat with this Number'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
