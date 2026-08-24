'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: any[];
  tags: any[];
  onSaved: () => void;
  contactToEdit?: any;
}

export function ContactFormModal({
  isOpen,
  onClose,
  groups,
  tags,
  onSaved,
  contactToEdit,
}: ContactFormModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customCompany, setCustomCompany] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contactToEdit) {
      setPhoneNumber(contactToEdit.phoneNumber || '');
      setFirstName(contactToEdit.firstName || '');
      setLastName(contactToEdit.lastName || '');
      setEmail(contactToEdit.email || '');
      setSelectedGroupIds(contactToEdit.groups?.map((g: any) => g.groupId) || []);
      setSelectedTagIds(contactToEdit.tags?.map((t: any) => t.tagId) || []);
      setStatus(contactToEdit.status || 'ACTIVE');

      let custom: any = {};
      try {
        custom = contactToEdit.customAttributes ? JSON.parse(contactToEdit.customAttributes) : {};
      } catch {}
      setCustomCompany(custom.company || '');
      setCustomCity(custom.city || '');
    } else {
      setPhoneNumber('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setSelectedGroupIds([]);
      setSelectedTagIds([]);
      setCustomCompany('');
      setCustomCity('');
      setStatus('ACTIVE');
    }
  }, [contactToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const customAttributes: Record<string, any> = {};
      if (customCompany) customAttributes.company = customCompany;
      if (customCity) customAttributes.city = customCity;

      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(contactToEdit?.id ? { id: contactToEdit.id } : {}),
          phoneNumber,
          firstName,
          lastName,
          email,
          groupIds: selectedGroupIds,
          tagIds: selectedTagIds,
          customAttributes,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to save contact');

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {contactToEdit ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <p className="text-xs text-slate-500">Contact information & audience tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. +971501234567 or +12025550143"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ACTIVE">Active (Can Receive Broadcasts)</option>
                <option value="UNSUBSCRIBED">Unsubscribed (Opted Out)</option>
                <option value="BOUNCED">Bounced / Invalid</option>
              </select>
            </div>
          </div>

          {/* Custom Attributes */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company</label>
              <input
                type="text"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                placeholder="Company Name"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">City / Region</label>
              <input
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder="Dubai, UAE"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          {/* Group assignment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign Groups</label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const isSelected = selectedGroupIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGroupIds(selectedGroupIds.filter((id) => id !== g.id));
                      } else {
                        setSelectedGroupIds([...selectedGroupIds, g.id]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tag assignment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const isSelected = selectedTagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTagIds(selectedTagIds.filter((id) => id !== t.id));
                      } else {
                        setSelectedTagIds([...selectedTagIds, t.id]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              {loading ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
