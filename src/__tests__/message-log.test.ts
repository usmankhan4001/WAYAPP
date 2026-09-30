import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    chatMessage: { findUnique: vi.fn(), create: vi.fn() },
    contact: { upsert: vi.fn() },
    conversation: { upsert: vi.fn() },
    template: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/api/auth', () => ({
  authenticateApiRequest: vi.fn().mockResolvedValue({ auth: { type: 'API_KEY', keyId: 'k1', scopes: ['messages:send'] } }),
}));

import { POST } from '@/app/api/v1/messages/log/route';
import { renderTemplateBody } from '@/lib/whatsapp/template-render';

const call = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/v1/messages/log', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));

describe('renderTemplateBody', () => {
  const components = JSON.stringify([
    { type: 'HEADER', format: 'TEXT', text: 'Hello {{1}}' },
    { type: 'BODY', text: 'Hi {{1}}, your {{2}} is ready.' },
  ]);

  it('fills positional variables and includes a text header', () => {
    expect(renderTemplateBody(components, ['Sam', 'quote'], 't')).toBe('Hello Sam\n\nHi Sam, your quote is ready.');
  });

  it('leaves an unfilled placeholder visible rather than blank', () => {
    expect(renderTemplateBody(components, ['Sam'], 't')).toContain('{{2}}');
  });

  it('falls back to the tag for missing, unparsable or body-less components', () => {
    expect(renderTemplateBody(undefined, [], 'welcome')).toBe('[Template: welcome]');
    expect(renderTemplateBody('not json', [], 'welcome')).toBe('[Template: welcome]');
    expect(renderTemplateBody('[{"type":"FOOTER","text":"x"}]', [], 'welcome')).toBe('[Template: welcome]');
  });
});

describe('POST /api/v1/messages/log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.chatMessage.findUnique.mockResolvedValue(null);
    prismaMock.contact.upsert.mockResolvedValue({ id: 'c1' });
    prismaMock.conversation.upsert.mockResolvedValue({ id: 'v1' });
    prismaMock.chatMessage.create.mockResolvedValue({ id: 'm1' });
    prismaMock.template.findFirst.mockResolvedValue({ components: '[{"type":"BODY","text":"Hi {{1}}"}]' });
  });

  it('records an outbound template message with its rendered text', async () => {
    const res = await call({ to: '+923186294023', wamid: 'wamid.ABC123', type: 'template', templateName: 'gcc_welcome', bodyVariables: ['Farooq'] });
    expect(await res.json()).toEqual({ success: true, messageId: 'm1', duplicate: false });
    expect(prismaMock.chatMessage.create.mock.calls[0][0].data).toMatchObject({
      direction: 'OUTBOUND',
      messageType: 'template',
      body: 'Hi Farooq',
      wamid: 'wamid.ABC123',
      phoneNumber: '+923186294023',
    });
  });

  it('is idempotent on wamid', async () => {
    prismaMock.chatMessage.findUnique.mockResolvedValue({ id: 'existing' });
    const res = await call({ to: '+923186294023', wamid: 'wamid.ABC123', text: 'hello' });
    expect(await res.json()).toEqual({ success: true, messageId: 'existing', duplicate: true });
    expect(prismaMock.chatMessage.create).not.toHaveBeenCalled();
  });

  it('never changes an existing contact or the customer-activity clock', async () => {
    await call({ to: '+923186294023', wamid: 'wamid.NEW999', text: 'hello' });
    expect(prismaMock.contact.upsert.mock.calls[0][0].update).toEqual({});
    expect(prismaMock.conversation.upsert.mock.calls[0][0].update).not.toHaveProperty('unreadCount');
  });

  it('rejects an invalid phone number and an invalid payload', async () => {
    expect((await call({ to: '123abc', text: 'x' })).status).toBe(400);
    expect((await call({ text: 'x' })).status).toBe(400);
  });
});
