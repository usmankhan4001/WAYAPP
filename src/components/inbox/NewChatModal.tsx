'use client';

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, ArrowRight } from 'lucide-react';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: AnyRecord) => void;
}

export function NewChatModal({ isOpen, onClose, onSelectContact }: NewChatModalProps) {
  const [contacts, setContacts] = useState<AnyRecord[]>([]);
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

  const handleCreateAndSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: manualPhone.trim(), firstName: manualName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create contact');
      onSelectContact(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      title={
        <span className="inline-flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-wa-bubble-out text-wa-bubble-out-foreground">
            <UserPlus className="size-4" />
          </span>
          Start new conversation
        </span>
      }
      description="Pick an existing contact or enter a new number"
    >
      <div className="space-y-3">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="max-h-[240px] min-h-[140px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No contacts found matching search</div>
          ) : (
            contacts.map((c) => {
              const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectContact(c);
                    onClose();
                  }}
                  className="group flex w-full items-center justify-between p-2.5 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{name}</p>
                      <p className="font-mono text-[0.6875rem] text-muted-foreground">{c.phoneNumber}</p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </button>
              );
            })
          )}
        </div>

        <form onSubmit={handleCreateAndSelect} className="space-y-2.5 rounded-lg border border-border bg-muted p-3">
          <p className="text-[0.6875rem] font-medium text-foreground">Or message a new number:</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              placeholder="Phone (e.g. +971501234567)"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              className="font-mono"
            />
            <Input placeholder="Contact name (optional)" value={manualName} onChange={(e) => setManualName(e.target.value)} />
          </div>
          <Button type="submit" variant="wa" className="w-full" disabled={creating || !manualPhone.trim()}>
            <UserPlus />
            {creating ? 'Starting…' : 'Start chat with this number'}
          </Button>
        </form>
      </div>
    </Modal>
  );
}
