import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { prismaMock, emitMock } = vi.hoisted(() => ({
  prismaMock: {
    webhookEndpoint: { findMany: vi.fn() },
    webhookDelivery: { create: vi.fn() },
    contact: { findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
  },
  emitMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/worker/outbound-webhooks', () => ({ emitWebhook: emitMock }));

import { checkWebhookUrl, isPrivateAddress } from '@/lib/api/ssrf';
import { normalizeEvents } from '@/lib/api/webhook-input';
import { buildOpenApiDocument } from '@/lib/api/openapi';
import { authenticateApiRequest, hashApiKey } from '@/lib/api/auth';
import { GET as listContacts, POST as createContact } from '@/app/api/v1/contacts/route';

const publicDns = async () => ['93.184.216.34'];

describe('normalizeEvents', () => {
  it('accepts catalog names as an array or comma string and de-duplicates', () => {
    expect(normalizeEvents(['message.received', 'message.received', 'contact.created'])).toEqual({
      ok: true,
      events: 'message.received,contact.created',
    });
    expect(normalizeEvents('message.sent, contact.updated')).toEqual({ ok: true, events: 'message.sent,contact.updated' });
    expect(normalizeEvents('*')).toEqual({ ok: true, events: '*' });
  });

  it('rejects unknown names and empty lists', () => {
    const bad = normalizeEvents(['message.received', 'message.exploded']);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('message.exploded');
    expect(normalizeEvents([]).ok).toBe(false);
    expect(normalizeEvents(undefined).ok).toBe(false);
  });
});

describe('SSRF guard', () => {
  it('rejects non-http schemes and credentials', async () => {
    for (const u of ['ftp://example.com/x', 'file:///etc/passwd', 'javascript:alert(1)', 'not a url', 'https://user:pw@example.com/']) {
      expect((await checkWebhookUrl(u, publicDns)).ok).toBe(false);
    }
  });

  it('rejects localhost, loopback, link-local and private ranges given as literals', async () => {
    for (const u of [
      'http://localhost/hook', 'http://app.localhost/', 'http://127.0.0.1/', 'http://127.1.2.3:8080/', 'http://0.0.0.0/',
      'http://169.254.169.254/latest/meta-data', 'http://10.0.0.5/', 'http://172.16.0.1/', 'http://172.31.255.255/',
      'http://192.168.1.10/', 'http://100.64.0.1/', 'http://[::1]/', 'http://[fd00::1]/', 'http://[fe80::1]/',
      'http://[::ffff:127.0.0.1]/',
    ]) {
      const r = await checkWebhookUrl(u, publicDns);
      expect(r.ok, u).toBe(false);
    }
  });

  it('rejects a hostname that resolves to a private address, even if only one record is private', async () => {
    expect((await checkWebhookUrl('https://evil.example.com/', async () => ['10.1.2.3'])).ok).toBe(false);
    expect((await checkWebhookUrl('https://evil.example.com/', async () => ['93.184.216.34', '169.254.169.254'])).ok).toBe(false);
  });

  it('rejects hostnames that do not resolve', async () => {
    expect((await checkWebhookUrl('https://nope.example.com/', async () => { throw new Error('ENOTFOUND'); })).ok).toBe(false);
  });

  it('allows public http and https addresses', async () => {
    expect((await checkWebhookUrl('https://hooks.example.com/wayapp', publicDns)).ok).toBe(true);
    expect((await checkWebhookUrl('http://8.8.8.8/x', publicDns)).ok).toBe(true);
    expect(isPrivateAddress('172.32.0.1')).toBe(false);
    expect(isPrivateAddress('172.15.0.1')).toBe(false);
  });
});

describe('emitWebhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queues one delivery for each active endpoint subscribed to the event, and never throws', async () => {
    const real = await vi.importActual<typeof import('@/worker/outbound-webhooks')>('@/worker/outbound-webhooks');
    prismaMock.webhookEndpoint.findMany.mockResolvedValue([
      { id: 'a', events: 'message.sent,contact.created' },
      { id: 'b', events: 'contact.created' },
      { id: 'c', events: '*' },
    ]);
    await real.emitWebhook('message.sent', { contactId: 'c1' });
    const targets = prismaMock.webhookDelivery.create.mock.calls.map((c) => c[0].data.endpointId);
    expect(targets).toEqual(['a', 'c']);
    const envelope = JSON.parse(prismaMock.webhookDelivery.create.mock.calls[0][0].data.payload);
    expect(envelope).toMatchObject({ event: 'message.sent', data: { contactId: 'c1' } });

    prismaMock.webhookEndpoint.findMany.mockRejectedValue(new Error('db down'));
    await expect(real.emitWebhook('message.sent', {})).resolves.toBeUndefined();
  });

  it('drops a name that is not in the catalog instead of queueing it', async () => {
    const real = await vi.importActual<typeof import('@/worker/outbound-webhooks')>('@/worker/outbound-webhooks');
    await real.emitWebhook('not.an.event' as any, {});
    expect(prismaMock.webhookEndpoint.findMany).not.toHaveBeenCalled();
  });
});

describe('OpenAPI document', () => {
  it('declares the X-API-Key scheme and the core v1 paths', () => {
    const doc: any = buildOpenApiDocument('https://x.test');
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.components.securitySchemes.ApiKeyAuth).toMatchObject({ type: 'apiKey', in: 'header', name: 'X-API-Key' });
    for (const p of ['/api/v1/messages', '/api/v1/contacts', '/api/v1/contacts/{id}/tags', '/api/v1/conversations/{id}/messages']) {
      expect(doc.paths[p], p).toBeDefined();
    }
  });
});

describe('v1 contacts route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a request with no credentials using the { error, code } shape', async () => {
    const res = await createContact(new NextRequest('http://localhost/api/v1/contacts', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'unauthorized' });
  });

  it('rejects a key without the required scope', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue({ id: 'k', scopes: 'contacts:read', userId: null, revokedAt: null, expiresAt: null });
    prismaMock.apiKey.update.mockResolvedValue({});
    const res = await createContact(
      new NextRequest('http://localhost/api/v1/contacts', { method: 'POST', body: '{}', headers: { 'x-api-key': 'way_live_x' } })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'forbidden' });
    expect(hashApiKey('way_live_x')).toBe(prismaMock.apiKey.findUnique.mock.calls[0][0].where.keyHash);
  });

  it('creates a contact and emits contact.created', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue({ id: 'k', scopes: 'contacts:write', userId: null, revokedAt: null, expiresAt: null });
    prismaMock.apiKey.update.mockResolvedValue({});
    prismaMock.contact.findUnique.mockResolvedValue(null);
    prismaMock.contact.upsert.mockResolvedValue({ id: 'c1', phoneNumber: '+14155550123', firstName: 'Sam', lastName: null });
    const res = await createContact(
      new NextRequest('http://localhost/api/v1/contacts', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: '+14155550123', firstName: 'Sam' }),
        headers: { 'x-api-key': 'way_live_x', 'content-type': 'application/json' },
      })
    );
    expect(res.status).toBe(201);
    expect(emitMock).toHaveBeenCalledWith('contact.created', expect.objectContaining({ contactId: 'c1', source: 'api' }));
  });

  it('lists contacts with a next cursor', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue({ id: 'k', scopes: '*', userId: null, revokedAt: null, expiresAt: null });
    prismaMock.apiKey.update.mockResolvedValue({});
    prismaMock.contact.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const res = await listContacts(
      new NextRequest('http://localhost/api/v1/contacts?limit=2&search=sam', { headers: { 'x-api-key': 'way_live_x' } })
    );
    const body = await res.json();
    expect(body.data.map((c: any) => c.id)).toEqual(['a', 'b']);
    expect(body.pagination).toEqual({ nextCursor: 'c', limit: 2 });
    expect(prismaMock.contact.findMany.mock.calls[0][0].where.OR).toBeDefined();
  });
});

describe('authenticateApiRequest', () => {
  it('returns a coded 401 for an unknown key', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue(null);
    const r = await authenticateApiRequest(new NextRequest('http://localhost/x', { headers: { 'x-api-key': 'nope' } }));
    expect('response' in r && r.response.status).toBe(401);
  });
});
