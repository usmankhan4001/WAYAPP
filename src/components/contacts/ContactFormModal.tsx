'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: AnyRecord[];
  tags: AnyRecord[];
  onSaved: () => void;
  contactToEdit?: AnyRecord | null;
}

const fieldLabel = 'mb-1 block text-xs font-semibold text-foreground';
const selectClass =
  'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function ContactFormModal({ isOpen, onClose, groups, tags, onSaved, contactToEdit }: ContactFormModalProps) {
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
      setSelectedGroupIds(contactToEdit.groups?.map((g: AnyRecord) => g.groupId) || []);
      setSelectedTagIds(contactToEdit.tags?.map((t: AnyRecord) => t.tagId) || []);
      setStatus(contactToEdit.status || 'ACTIVE');
      let custom: AnyRecord = {};
      try {
        custom = contactToEdit.customAttributes ? JSON.parse(contactToEdit.customAttributes) : {};
      } catch {
        /* noop */
      }
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

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const customAttributes: AnyRecord = {};
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      title={
        <span className="inline-flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-foreground">
            <UserPlus className="size-4" />
          </span>
          {contactToEdit ? 'Edit contact' : 'Add new contact'}
        </span>
      }
      description="Contact information &amp; audience tags"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="contact-form" disabled={loading}>
            {loading ? 'Saving…' : 'Save contact'}
          </Button>
        </>
      }
    >
      <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className={fieldLabel}>
            WhatsApp phone number <span className="text-destructive">*</span>
          </label>
          <Input
            required
            placeholder="e.g. +971501234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>First name</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
          </div>
          <div>
            <label className={fieldLabel}>Last name</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Email (optional)</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
          </div>
          <div>
            <label className={fieldLabel}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="ACTIVE">Active (can receive broadcasts)</option>
              <option value="UNSUBSCRIBED">Unsubscribed (opted out)</option>
              <option value="BOUNCED">Bounced / invalid</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted p-3">
          <div>
            <label className={fieldLabel}>Company</label>
            <Input value={customCompany} onChange={(e) => setCustomCompany(e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <label className={fieldLabel}>City / region</label>
            <Input value={customCity} onChange={(e) => setCustomCity(e.target.value)} placeholder="Dubai, UAE" />
          </div>
        </div>

        <div>
          <label className={cn(fieldLabel, 'mb-1.5')}>Assign groups</label>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const sel = selectedGroupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(selectedGroupIds, setSelectedGroupIds, g.id)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    sel ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-foreground hover:bg-accent'
                  )}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={cn(fieldLabel, 'mb-1.5')}>Assign tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const sel = selectedTagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(selectedTagIds, setSelectedTagIds, t.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    sel ? 'border-info bg-info text-info-foreground' : 'border-border bg-muted text-foreground hover:bg-accent'
                  )}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
