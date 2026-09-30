'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, KeyRound, Pencil, Plus, Power, RefreshCw, Send, Trash2, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/lib/hooks/use-confirm';

interface Endpoint {
  id: string;
  name: string;
  url: string;
  events: string;
  isActive: boolean;
  secretHint: string;
  _count?: { deliveries: number };
}
interface EventInfo { name: string; label: string }
interface Delivery {
  id: string;
  event: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  attempts: number;
  lastError: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  endpoint: { id: string; name: string };
}

const STATUS_LABEL: Record<Delivery['status'], { text: string; tone: string }> = {
  DELIVERED: { text: 'Delivered', tone: 'success' },
  PENDING: { text: 'Waiting', tone: 'warning' },
  FAILED: { text: 'Failed', tone: 'destructive' },
};

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export default function DeveloperSettingsPage() {
  const confirm = useConfirm();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [filterEndpoint, setFilterEndpoint] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [editing, setEditing] = useState<Endpoint | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[] });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadEndpoints = useCallback(async () => {
    try {
      const [eps, evs] = await Promise.all([call('/api/webhooks/endpoints'), call('/api/webhooks/events')]);
      setEndpoints(eps);
      setEvents(evs);
    } catch {
      setBlocked(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeliveries = useCallback(async () => {
    const q = new URLSearchParams();
    if (filterEndpoint) q.set('endpointId', filterEndpoint);
    if (filterStatus) q.set('status', filterStatus);
    try {
      setDeliveries(await call(`/api/webhooks/deliveries?${q.toString()}`));
    } catch {
      /* the endpoints call already shows the access message */
    }
  }, [filterEndpoint, filterStatus]);

  useEffect(() => { loadEndpoints(); }, [loadEndpoints]);
  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  const labelFor = useMemo(() => Object.fromEntries(events.map((e) => [e.name, e.label])), [events]);

  const openForm = (ep: Endpoint | 'new') => {
    setFormError('');
    setEditing(ep);
    setForm(
      ep === 'new'
        ? { name: '', url: '', events: ['message.received'] }
        : { name: ep.name, url: ep.url, events: ep.events === '*' ? events.map((e) => e.name) : ep.events.split(',') }
    );
  };

  const toggleEvent = (name: string) =>
    setForm((f) => ({ ...f, events: f.events.includes(name) ? f.events.filter((e) => e !== name) : [...f.events, name] }));

  const save = async () => {
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        const res = await call('/api/webhooks/endpoints', { method: 'POST', body: JSON.stringify(form) });
        setSecret(res.secret);
      } else if (editing) {
        await call(`/api/webhooks/endpoints/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast.success('Webhook saved');
      }
      setEditing(null);
      loadEndpoints();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (ep: Endpoint, isActive: boolean) => {
    try {
      await call(`/api/webhooks/endpoints/${ep.id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
      toast.success(isActive ? 'Webhook turned on' : 'Webhook turned off');
      loadEndpoints();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sendTest = async (ep: Endpoint) => {
    try {
      const res = await call(`/api/webhooks/endpoints/${ep.id}/test`, { method: 'POST' });
      if (res.success) toast.success(`Test delivered (${res.statusCode}) in ${res.durationMs} ms`);
      else toast.error(`Your server answered ${res.statusCode}. The test was not accepted.`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const rotate = async (ep: Endpoint) => {
    const ok = await confirm({
      title: 'Create a new signing secret?',
      description: 'The old secret stops working straight away. Update your server with the new one.',
      confirmLabel: 'Create new secret',
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await call(`/api/webhooks/endpoints/${ep.id}/rotate-secret`, { method: 'POST' });
      setSecret(res.secret);
      loadEndpoints();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (ep: Endpoint) => {
    const ok = await confirm({
      title: `Delete "${ep.name}"?`,
      description: 'Its delivery history is deleted too.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await call(`/api/webhooks/endpoints/${ep.id}`, { method: 'DELETE' });
      loadEndpoints();
      loadDeliveries();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const retry = async (d: Delivery) => {
    try {
      await call(`/api/webhooks/deliveries/${d.id}/retry`, { method: 'POST' });
      toast.success('Queued to send again');
      loadDeliveries();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the text and copy it by hand.');
    }
  };

  if (blocked) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <EmptyState
          icon={Webhook}
          title="Webhooks are for admins"
          description="Ask an account admin to open this page, or to give you the admin role."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader
        icon={<Webhook />}
        title="Webhooks"
        description="Get a message sent to your own system whenever something happens in WayApp, like a customer writing to you."
        actions={
          <Button onClick={() => openForm('new')}>
            <Plus /> Add webhook
          </Button>
        }
      />

      <section className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : endpoints.length === 0 ? (
          <EmptyState
            icon={Webhook}
            title="No webhooks yet"
            description="Add the web address of your system and pick what you want to hear about."
          />
        ) : (
          endpoints.map((ep) => (
            <div key={ep.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">{ep.name}</h2>
                <StatusBadge tone={ep.isActive ? 'success' : 'neutral'}>{ep.isActive ? 'On' : 'Off'}</StatusBadge>
              </div>
              <p className="break-all text-sm text-muted-foreground">{ep.url}</p>
              <div className="flex flex-wrap gap-1.5">
                {(ep.events === '*' ? ['All events'] : ep.events.split(',')).map((e) => (
                  <Badge key={e} variant="secondary">{labelFor[e] || e}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Signing secret {ep.secretHint}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => sendTest(ep)}><Send /> Send test event</Button>
                <Button size="sm" variant="outline" onClick={() => openForm(ep)}><Pencil /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setActive(ep, !ep.isActive)}>
                  <Power /> {ep.isActive ? 'Turn off' : 'Turn on'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => rotate(ep)}><KeyRound /> New secret</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(ep)}><Trash2 /> Delete</Button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">Delivery log</h2>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Filter by webhook"
              value={filterEndpoint}
              onChange={(e) => setFilterEndpoint(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="">All webhooks</option>
              {endpoints.map((ep) => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
            </select>
            <select
              aria-label="Filter by result"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="">Any result</option>
              <option value="DELIVERED">Delivered</option>
              <option value="PENDING">Waiting</option>
              <option value="FAILED">Failed</option>
            </select>
            <Button size="sm" variant="outline" onClick={loadDeliveries}><RefreshCw /> Refresh</Button>
          </div>
        </div>

        {deliveries.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Nothing has been sent yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {deliveries.map((d) => (
              <li key={d.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={STATUS_LABEL[d.status].tone}>{STATUS_LABEL[d.status].text}</StatusBadge>
                    <span className="text-sm font-medium text-foreground">{labelFor[d.event] || d.event}</span>
                    <span className="text-xs text-muted-foreground">to {d.endpoint.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.createdAt).toLocaleString()} - {d.attempts} {d.attempts === 1 ? 'try' : 'tries'}
                  </p>
                  {d.lastError && d.status !== 'DELIVERED' && (
                    <p className="break-words text-xs text-destructive">{d.lastError}</p>
                  )}
                </div>
                {d.status !== 'DELIVERED' && (
                  <Button size="sm" variant="outline" onClick={() => retry(d)}><RefreshCw /> Retry</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === 'new' ? 'Add webhook' : 'Edit webhook'}
        description="We send a signed message to this address each time one of the chosen things happens."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name.trim() || !form.url.trim() || form.events.length === 0}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Name
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My CRM" />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Web address
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com/hooks/wayapp" inputMode="url" />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Tell me when</legend>
            {events.map((ev) => (
              <label key={ev.name} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={form.events.includes(ev.name)} onCheckedChange={() => toggleEvent(ev.name)} />
                {ev.label}
              </label>
            ))}
          </fieldset>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>
      </Modal>

      <Modal
        open={secret !== null}
        onOpenChange={(o) => !o && setSecret(null)}
        title="Your signing secret"
        description="Copy it now. For your safety we will not show it again."
        footer={<Button onClick={() => setSecret(null)}>I have saved it</Button>}
      >
        <div className="space-y-3">
          <code className="block break-all rounded-lg border border-border bg-muted p-3 text-sm text-foreground">{secret}</code>
          <Button variant="outline" onClick={copySecret}>
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy secret'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Use it to check that a message really came from WayApp. Each message carries an X-WAYAPP-Signature header.
          </p>
        </div>
      </Modal>
    </div>
  );
}
