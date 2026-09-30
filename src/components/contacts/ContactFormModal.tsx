'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { LEAD_STAGES } from '@/lib/constants/lead-stages';
import { consentSentence, contactName, stageWord } from '@/lib/contacts/present';
import { Alert } from '@/components/ui/alert';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ColorDot } from '@/components/contacts/ColorDot';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: AnyRecord[];
  tags: AnyRecord[];
  onSaved: () => void;
  contactToEdit?: AnyRecord | null;
  /** shown only when editing; the page asks for confirmation */
  onDelete?: (id: string) => void | Promise<void>;
}

const fieldLabel = 'mb-1 block text-sm font-medium text-foreground';
const selectClass =
  'h-11 w-full rounded-xl border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

/**
 * Add a contact, or open one to see and change everything about them. A bottom sheet on
 * phones, a dialog on desktop (BottomSheet decides). Field names sent to the API are unchanged.
 */
export function ContactFormModal({ isOpen, onClose, groups, tags, onSaved, contactToEdit, onDelete }: ContactFormModalProps) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customCompany, setCustomCompany] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [notes, setNotes] = useState('');
  const [existingAttrs, setExistingAttrs] = useState<AnyRecord>({});
  const [stage, setStage] = useState('NEW_LEAD');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setPhoneError(null);
    if (contactToEdit) {
      setPhoneNumber(contactToEdit.phoneNumber || '');
      setFirstName(contactToEdit.firstName || '');
      setLastName(contactToEdit.lastName || '');
      setEmail(contactToEdit.email || '');
      setSelectedGroupIds(contactToEdit.groups?.map((g: AnyRecord) => g.groupId) || []);
      setSelectedTagIds(contactToEdit.tags?.map((t: AnyRecord) => t.tagId) || []);
      setStatus(contactToEdit.status || 'ACTIVE');
      setStage(contactToEdit.leadStage || 'NEW_LEAD');
      let custom: AnyRecord = {};
      try {
        custom = contactToEdit.customAttributes ? JSON.parse(contactToEdit.customAttributes) : {};
      } catch {
        /* noop */
      }
      setExistingAttrs(custom);
      setCustomCompany(custom.company || '');
      setCustomCity(custom.city || '');
      setNotes(custom.notes || '');
    } else {
      setPhoneNumber('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setSelectedGroupIds([]);
      setSelectedTagIds([]);
      setCustomCompany('');
      setCustomCity('');
      setNotes('');
      setExistingAttrs({});
      setStage('NEW_LEAD');
      setStatus('ACTIVE');
    }
  }, [contactToEdit, isOpen]);

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  // A stage change saves straight away: a menu, no dragging needed on a phone.
  const changeStage = async (next: string) => {
    setStage(next);
    if (!contactToEdit?.id) return;
    try {
      const res = await fetch('/api/chat/contact-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contactToEdit.id, leadStage: next }),
      });
      if (!res.ok) throw new Error('stage');
      onSaved();
    } catch {
      setError('We could not change the stage. Check your connection and try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phoneNumber.trim()) {
      setPhoneError('Enter a WhatsApp number, for example +971 50 123 4567.');
      return;
    }
    setPhoneError(null);
    setLoading(true);
    try {
      const customAttributes: AnyRecord = { ...existingAttrs };
      const fields: Array<[string, string]> = [
        ['company', customCompany],
        ['city', customCity],
        ['notes', notes],
      ];
      for (const [key, value] of fields) {
        if (value) customAttributes[key] = value;
        else delete customAttributes[key];
      }
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
      if (!res.ok || data.error) throw new Error(data.error || 'We could not save this contact. Try again.');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not save this contact. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const consent = contactToEdit ? consentSentence({ ...contactToEdit, status }) : null;

  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      title={contactToEdit ? contactName(contactToEdit) : 'Add contact'}
      description={contactToEdit ? 'Contact details' : 'Save someone you want to message'}
      footer={
        <>
          {contactToEdit?.id && onDelete && (
            <Button type="button" variant="ghost" className="text-danger sm:mr-auto" onClick={() => onDelete(contactToEdit.id)}>
              Delete contact
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="contact-form" disabled={loading}>
            {loading ? 'Saving...' : 'Save contact'}
          </Button>
        </>
      }
    >
      <form id="contact-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}

        <div>
          <label htmlFor="cf-phone" className={fieldLabel}>
            WhatsApp number
          </label>
          <Input
            id="cf-phone"
            inputMode="tel"
            placeholder="e.g. +971501234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            aria-invalid={phoneError ? true : undefined}
          />
          {phoneError && <p className="mt-1 text-sm text-danger">{phoneError}</p>}
          {contactToEdit?.id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => router.push(`/inbox?contactId=${contactToEdit.id}`)}
            >
              <MessageSquare />
              Open chat
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cf-first" className={fieldLabel}>First name</label>
            <Input id="cf-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Sara" />
          </div>
          <div>
            <label htmlFor="cf-last" className={fieldLabel}>Last name</label>
            <Input id="cf-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Khan" />
          </div>
        </div>

        {contactToEdit?.id && (
          <div>
            <label htmlFor="cf-stage" className={fieldLabel}>Stage</label>
            <select id="cf-stage" value={stage} onChange={(e) => changeStage(e.target.value)} className={selectClass}>
              {LEAD_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {stageWord(s.id)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <span className={fieldLabel}>Labels</span>
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 && <p className="text-sm text-muted-foreground">No labels yet. Create some from Labels and groups.</p>}
            {tags.map((t) => (
              <Chip key={t.id} selected={selectedTagIds.includes(t.id)} onClick={() => toggle(selectedTagIds, setSelectedTagIds, t.id)}>
                <ColorDot color={t.color} className="size-2" />
                {t.name}
              </Chip>
            ))}
          </div>
        </div>

        {groups.length > 0 && (
          <div>
            <span className={fieldLabel}>Groups</span>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <Chip key={g.id} selected={selectedGroupIds.includes(g.id)} onClick={() => toggle(selectedGroupIds, setSelectedGroupIds, g.id)}>
                  {g.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cf-company" className={fieldLabel}>Company</label>
            <Input id="cf-company" value={customCompany} onChange={(e) => setCustomCompany(e.target.value)} placeholder="Company name" />
          </div>
          <div>
            <label htmlFor="cf-city" className={fieldLabel}>City</label>
            <Input id="cf-city" value={customCity} onChange={(e) => setCustomCity(e.target.value)} placeholder="Dubai" />
          </div>
        </div>

        <div>
          <label htmlFor="cf-email" className={fieldLabel}>Email (optional)</label>
          <Input id="cf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sara@example.com" />
        </div>

        <div>
          <label htmlFor="cf-notes" className={fieldLabel}>Notes</label>
          <Textarea id="cf-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" rows={3} />
        </div>

        <div className="space-y-2">
          <span className={fieldLabel}>Permission to message</span>
          {consent && !consent.recorded && <Alert tone="warning">{consent.sentence}</Alert>}
          {consent?.recorded && <p className="text-sm text-muted-foreground">{consent.sentence}</p>}
          <label htmlFor="cf-status" className="sr-only">Can we message this person?</label>
          <select id="cf-status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="ACTIVE">Can receive messages</option>
            <option value="UNSUBSCRIBED">Opted out, do not message</option>
            <option value="BOUNCED">Number does not work</option>
          </select>
          {consent?.optedOut && <Alert tone="info">This person opted out. They will not get broadcasts.</Alert>}
        </div>
      </form>
    </BottomSheet>
  );
}
