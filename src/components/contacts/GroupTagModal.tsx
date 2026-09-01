'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Tag as TagIcon, Users, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useConfirm } from '@/lib/hooks/use-confirm';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface GroupTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: AnyRecord[];
  tags: AnyRecord[];
  onRefresh: () => void;
}

export function GroupTagModal({ isOpen, onClose, groups, tags, onRefresh }: GroupTagModalProps) {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'GROUPS' | 'TAGS'>('GROUPS');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#10B981');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc, color: newGroupColor }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create group');
      setNewGroupName('');
      setNewGroupDesc('');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const createTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName, color: newTagColor }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create tag');
      setNewTagName('');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setLoading(false);
    }
  };

  const removeGroup = async (id: string) => {
    if (!(await confirm({ title: 'Delete this group?', description: 'Contacts will not be deleted.', destructive: true, confirmLabel: 'Delete' }))) return;
    try {
      await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      /* noop */
    }
  };

  const removeTag = async (id: string) => {
    if (!(await confirm({ title: 'Delete this tag?', destructive: true, confirmLabel: 'Delete' }))) return;
    try {
      await fetch(`/api/tags?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      /* noop */
    }
  };

  const tab = (id: 'GROUPS' | 'TAGS', Icon: typeof Users, label: string) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setError(null);
      }}
      className={cn(
        'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors',
        activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  );

  return (
    <Modal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title="Manage audience categorization"
      description="Configure static groups and tag taxonomies"
    >
      <div className="-mx-4 mb-4 flex border-b border-border px-4">
        {tab('GROUPS', Users, `Contact groups (${groups.length})`)}
        {tab('TAGS', TagIcon, `Tags (${tags.length})`)}
      </div>

      {error && <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}

      {activeTab === 'GROUPS' ? (
        <div className="space-y-4">
          <form onSubmit={createGroup} className="space-y-3 rounded-lg border border-border bg-muted p-3">
            <span className="text-xs font-semibold text-foreground">Create new group</span>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Input required placeholder="Group name (e.g. VIP clients)" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  className="size-9 cursor-pointer rounded-lg border border-input bg-transparent p-1"
                />
                <Input placeholder="Description (optional)" value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} className="flex-1" />
              </div>
            </div>
            <Button type="submit" size="sm" className="w-full" disabled={loading}>
              <Plus />
              Add group
            </Button>
          </form>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Existing groups</span>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {groups.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">No groups created yet</p>
              ) : (
                groups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 transition-colors hover:bg-accent">
                    <div className="flex items-center gap-2.5">
                      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{g.name}</p>
                        {g.description && <p className="text-[0.6875rem] text-muted-foreground">{g.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">
                        {g._count?.contacts || 0} contacts
                      </span>
                      <Button variant="ghost" size="icon-sm" onClick={() => removeGroup(g.id)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={createTag} className="space-y-3 rounded-lg border border-border bg-muted p-3">
            <span className="text-xs font-semibold text-foreground">Create new tag</span>
            <div className="flex gap-2">
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="size-9 cursor-pointer rounded-lg border border-input bg-transparent p-1"
              />
              <Input required placeholder="Tag name (e.g. #high-intent)" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="flex-1" />
              <Button type="submit" size="sm" disabled={loading}>
                <Plus />
                Add
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Existing tags</span>
            <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted p-3">
              {tags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tags created yet</p>
              ) : (
                tags.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium"
                    style={{ borderColor: t.color, color: t.color }}
                  >
                    <span>{t.name}</span>
                    <span className="text-[0.625rem] text-muted-foreground">({t._count?.contacts || 0})</span>
                    <button onClick={() => removeTag(t.id)} className="ml-1 text-muted-foreground hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
