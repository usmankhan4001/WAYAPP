import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { prismaMock, clientMock } = vi.hoisted(() => ({
  prismaMock: {
    conversation: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
    conversationEvent: { createMany: vi.fn() },
    contact: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    chatMessage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      groupBy: vi.fn(),
    },
    campaignMessage: { findFirst: vi.fn() },
    settings: { findUnique: vi.fn() },
  },
  clientMock: {
    sendTextMessage: vi.fn(),
    sendMediaMessage: vi.fn(),
    sendTemplateMessage: vi.fn(),
    sendReaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth/rbac', () => ({
  requireAuth: vi.fn().mockResolvedValue({ session: { userId: 'u1', role: 'ADMIN' } }),
  requireRole: vi.fn().mockResolvedValue({ session: { userId: 'u1', role: 'ADMIN' } }),
}));
vi.mock('@/lib/whatsapp/client', () => ({
  WhatsAppClient: { createFromSettings: vi.fn().mockResolvedValue(clientMock) },
}));
vi.mock('@/worker/outbound-webhooks', () => ({ emitWebhook: vi.fn(), enqueueOutboundWebhook: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/whatsapp/contact-match', () => ({
  findInboundContact: vi.fn().mockResolvedValue({ contact: { id: 'c1', phoneNumber: '+15550001', firstName: 'Sam' }, exact: true }),
}));
vi.mock('@/lib/whatsapp/routing', () => ({ AssignmentEngine: { routeConversation: vi.fn() } }));
vi.mock('@/worker/inbound-events', () => ({ processInboundEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/push', () => ({ sendPushNotification: vi.fn().mockResolvedValue(undefined) }));

import { GET as listChats, POST as sendChat } from '@/app/api/chat/route';
import { PATCH as patchConversation } from '@/app/api/chat/conversations/[id]/route';
import { PATCH as starMessage } from '@/app/api/chat/messages/[id]/route';
import { POST as reactToMessage } from '@/app/api/chat/messages/[id]/reaction/route';
import { POST as addNote } from '@/app/api/chat/internal-notes/route';
import { POST as webhook } from '@/app/api/webhooks/whatsapp/route';
import { getReplyWindow } from '@/lib/whatsapp/window';
import { applyReaction, isSendable, parseReactions } from '@/lib/whatsapp/reactions';
import { dayLabel, replyStatusLine, tickState } from '@/components/inbox/chat-utils';

const req = (url: string, method = 'GET', body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  // mockReset (not resetAllMocks) so the module-level mocks above keep their implementations.
  Object.values(prismaMock).forEach((model) => Object.values(model).forEach((fn) => (fn as any).mockReset()));
  Object.values(clientMock).forEach((fn) => fn.mockReset());
  prismaMock.conversation.updateMany.mockResolvedValue({});
  prismaMock.conversation.findMany.mockResolvedValue([]);
  prismaMock.contact.findMany.mockResolvedValue([]);
  prismaMock.chatMessage.findMany.mockResolvedValue([]);
  prismaMock.chatMessage.groupBy.mockResolvedValue([]);
});

describe('chat list filters: pinned, archived, waiting', () => {
  it('excludes archived chats by default and puts pinned first', async () => {
    prismaMock.conversation.findMany.mockResolvedValue([]);
    await listChats(req('/api/chat'));
    const args = prismaMock.conversation.findMany.mock.calls[0][0];
    expect(args.where.archived).toBe(false);
    expect(args.orderBy[0]).toEqual({ pinned: 'desc' });
  });

  it('shows only archived chats for filter=archived and adds no virtual chats', async () => {
    await listChats(req('/api/chat?filter=archived'));
    expect(prismaMock.conversation.findMany.mock.calls[0][0].where.archived).toBe(true);
    expect(prismaMock.contact.findMany).not.toHaveBeenCalled();
  });

  it('does not let archived chats resurface as virtual chats in the default view', async () => {
    prismaMock.conversation.findMany
      .mockResolvedValueOnce([]) // the list
      .mockResolvedValueOnce([{ contactId: 'archived-contact' }]); // archived contact ids
    await listChats(req('/api/chat'));
    const notIn = prismaMock.contact.findMany.mock.calls[0][0].where.id.notIn;
    expect(notIn).toContain('archived-contact');
  });

  it('waiting on me keeps only chats whose last message is from the customer', async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      { id: 'a', contactId: 'c1', messages: [{ direction: 'INBOUND' }] },
      { id: 'b', contactId: 'c2', messages: [{ direction: 'OUTBOUND' }] },
    ]);
    const res = await listChats(req('/api/chat?filter=waiting'));
    const data = await res.json();
    expect(data.conversations.map((c: any) => c.id)).toEqual(['a']);
  });

  it('the last-message preview never includes internal notes', async () => {
    await listChats(req('/api/chat'));
    const inc = prismaMock.conversation.findMany.mock.calls[0][0].include.messages;
    expect(inc.where).toEqual({ direction: { not: 'INTERNAL' } });
  });

  it('unknown filters fall back to All', async () => {
    await listChats(req('/api/chat?filter=banana'));
    const where = prismaMock.conversation.findMany.mock.calls[0][0].where;
    expect(where.archived).toBe(false);
    expect(where.unreadCount).toBeUndefined();
  });

  it('closing soon keeps customers whose latest inbound is 21 to 24 hours old', async () => {
    const h = 60 * 60 * 1000;
    prismaMock.chatMessage.groupBy.mockResolvedValue([
      { contactId: 'soon', _max: { timestamp: new Date(Date.now() - 22 * h) } },
      { contactId: 'fresh', _max: { timestamp: new Date(Date.now() - 2 * h) } },
    ]);
    await listChats(req('/api/chat?filter=closing'));
    expect(prismaMock.conversation.findMany.mock.calls[0][0].where.contactId).toEqual({ in: ['soon'] });
  });

  it('PATCH sets pinned and archived, and mark-unread bumps a zero count to 1', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({ id: 'v1', unreadCount: 0, assignedToId: null, status: 'OPEN' });
    prismaMock.conversation.update.mockResolvedValue({ id: 'v1', contactId: 'c1' });
    await patchConversation(req('/api/chat/conversations/v1', 'PATCH', { pinned: true, archived: true, markUnread: true }), ctx('v1'));
    expect(prismaMock.conversation.update.mock.calls[0][0].data).toEqual({ pinned: true, archived: true, unreadCount: 1 });
  });

  it('PATCH still handles the existing status field', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({ id: 'v1', unreadCount: 0, assignedToId: null, status: 'OPEN' });
    prismaMock.conversation.update.mockResolvedValue({ id: 'v1', contactId: 'c1' });
    await patchConversation(req('/api/chat/conversations/v1', 'PATCH', { status: 'RESOLVED' }), ctx('v1'));
    expect(prismaMock.conversation.update.mock.calls[0][0].data).toEqual({ status: 'RESOLVED' });
  });
});

describe('internal notes are isolated from WhatsApp', () => {
  it('saves a note as INTERNAL/note with the author and never touches the WhatsApp client', async () => {
    prismaMock.contact.findUnique.mockResolvedValue({ id: 'c1', phoneNumber: '+15550001' });
    prismaMock.conversation.findUnique.mockResolvedValue({ id: 'v1' });
    prismaMock.chatMessage.create.mockResolvedValue({ id: 'n1' });
    const res = await addNote(req('/api/chat/internal-notes', 'POST', { contactId: 'c1', body: 'Call back tomorrow' }));
    expect(res.status).toBe(200);
    expect(prismaMock.chatMessage.create.mock.calls[0][0].data).toMatchObject({
      direction: 'INTERNAL',
      messageType: 'note',
      authorId: 'u1',
      body: 'Call back tomorrow',
    });
    expect(prismaMock.chatMessage.create.mock.calls[0][0].data.wamid).toBeUndefined();
    for (const fn of Object.values(clientMock)) expect(fn).not.toHaveBeenCalled();
    // A note is not an inbound message: it does not touch the conversation counters.
    expect(prismaMock.conversation.update).not.toHaveBeenCalled();
    expect(prismaMock.conversation.upsert).not.toHaveBeenCalled();
  });

  it('cannot react to a note (no send path reaches Meta)', async () => {
    prismaMock.chatMessage.findUnique.mockResolvedValue({ id: 'n1', direction: 'INTERNAL', messageType: 'note', wamid: null, phoneNumber: '+1' });
    const res = await reactToMessage(req('/api/chat/messages/n1/reaction', 'POST', { emoji: 'x' }), ctx('n1'));
    expect(res.status).toBe(400);
    expect(clientMock.sendReaction).not.toHaveBeenCalled();
  });

  it('cannot quote a note: replying to a note id sends without reply context', async () => {
    prismaMock.contact.findUnique.mockResolvedValue({ id: 'c1', phoneNumber: '+15550001', status: 'ACTIVE' });
    prismaMock.chatMessage.findFirst.mockResolvedValue({ timestamp: new Date() });
    prismaMock.chatMessage.findUnique.mockResolvedValue({ id: 'n1', direction: 'INTERNAL', messageType: 'note', wamid: 'wamid.note' });
    clientMock.sendTextMessage.mockResolvedValue({ messages: [{ id: 'wamid.out' }] });
    prismaMock.conversation.upsert.mockResolvedValue({ id: 'v1' });
    prismaMock.chatMessage.create.mockResolvedValue({ id: 'm1' });
    await sendChat(req('/api/chat', 'POST', { contactId: 'c1', text: 'hi', replyToWamid: 'wamid.note' }));
    expect(clientMock.sendTextMessage).toHaveBeenCalledWith('+15550001', 'hi', undefined);
    expect(prismaMock.chatMessage.create.mock.calls[0][0].data.replyToWamid).toBeNull();
  });

  it('the reply window only looks at INBOUND messages, so notes never open it', async () => {
    prismaMock.chatMessage.findFirst.mockResolvedValue(null);
    const win = await getReplyWindow('c1');
    expect(prismaMock.chatMessage.findFirst.mock.calls[0][0].where).toEqual({ contactId: 'c1', direction: 'INBOUND' });
    expect(win.isOpen).toBe(false);
  });

  it('isSendable is false for notes and true for normal messages', () => {
    expect(isSendable({ direction: 'INTERNAL', messageType: 'note' })).toBe(false);
    expect(isSendable({ direction: 'OUTBOUND', messageType: 'text' })).toBe(true);
  });
});

describe('reply context', () => {
  it('outbound send passes context to Meta and stores replyToWamid', async () => {
    prismaMock.contact.findUnique.mockResolvedValue({ id: 'c1', phoneNumber: '+15550001', status: 'ACTIVE' });
    prismaMock.chatMessage.findFirst.mockResolvedValue({ timestamp: new Date() });
    prismaMock.chatMessage.findUnique.mockResolvedValue({ id: 'm0', direction: 'INBOUND', messageType: 'text', wamid: 'wamid.in' });
    clientMock.sendTextMessage.mockResolvedValue({ messages: [{ id: 'wamid.out' }] });
    prismaMock.conversation.upsert.mockResolvedValue({ id: 'v1' });
    prismaMock.chatMessage.create.mockResolvedValue({ id: 'm1' });
    await sendChat(req('/api/chat', 'POST', { contactId: 'c1', text: 'yes', replyToWamid: 'wamid.in' }));
    expect(clientMock.sendTextMessage).toHaveBeenCalledWith('+15550001', 'yes', 'wamid.in');
    expect(prismaMock.chatMessage.create.mock.calls[0][0].data.replyToWamid).toBe('wamid.in');
  });

  it('inbound webhook stores context.id as replyToWamid', async () => {
    prismaMock.settings.findUnique.mockResolvedValue({ isMockMode: true });
    prismaMock.contact.update.mockResolvedValue({ id: 'c1', phoneNumber: '+15550001', firstName: 'Sam' });
    prismaMock.conversation.upsert.mockResolvedValue({ id: 'v1', assignedToId: 'u1' });
    prismaMock.chatMessage.upsert.mockResolvedValue({});
    prismaMock.campaignMessage.findFirst.mockResolvedValue(null);
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                contacts: [{ wa_id: '15550001', profile: { name: 'Sam' } }],
                messages: [
                  { from: '15550001', id: 'wamid.reply', type: 'text', text: { body: 'about this' }, timestamp: '1700000000', context: { id: 'wamid.orig' } },
                ],
              },
            },
          ],
        },
      ],
    };
    await webhook(req('/api/webhooks/whatsapp', 'POST', payload));
    expect(prismaMock.chatMessage.upsert.mock.calls[0][0].create.replyToWamid).toBe('wamid.orig');
  });
});

describe('reactions', () => {
  it('an inbound reaction attaches to the target message and creates no bubble', async () => {
    prismaMock.settings.findUnique.mockResolvedValue({ isMockMode: true });
    prismaMock.chatMessage.findUnique.mockResolvedValue({ id: 'm1', wamid: 'wamid.out', direction: 'OUTBOUND', messageType: 'text', reactions: null });
    prismaMock.chatMessage.update.mockResolvedValue({});
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                contacts: [{ wa_id: '15550001', profile: { name: 'Sam' } }],
                messages: [{ from: '15550001', id: 'wamid.r1', type: 'reaction', reaction: { message_id: 'wamid.out', emoji: '\u{1F44D}' }, timestamp: '1700000000' }],
              },
            },
          ],
        },
      ],
    };
    await webhook(req('/api/webhooks/whatsapp', 'POST', payload));
    expect(prismaMock.chatMessage.update).toHaveBeenCalledTimes(1);
    const data = prismaMock.chatMessage.update.mock.calls[0][0].data;
    expect(JSON.parse(data.reactions)).toEqual([{ emoji: '\u{1F44D}', from: 'customer' }]);
    expect(prismaMock.chatMessage.create).not.toHaveBeenCalled();
    expect(prismaMock.chatMessage.upsert).not.toHaveBeenCalled();
    expect(prismaMock.conversation.upsert).not.toHaveBeenCalled(); // no unread bump
  });

  it('our reaction is sent through the client and stored on the message, not as a new bubble', async () => {
    prismaMock.chatMessage.findUnique.mockResolvedValue({ id: 'm1', wamid: 'wamid.in', direction: 'INBOUND', messageType: 'text', phoneNumber: '+15550001', reactions: null });
    prismaMock.chatMessage.update.mockResolvedValue({});
    clientMock.sendReaction.mockResolvedValue({});
    await reactToMessage(req('/api/chat/messages/m1/reaction', 'POST', { emoji: '❤️' }), ctx('m1'));
    expect(clientMock.sendReaction).toHaveBeenCalledWith({ to: '+15550001', messageId: 'wamid.in', emoji: '❤️' });
    expect(prismaMock.chatMessage.create).not.toHaveBeenCalled();
  });

  it('keeps one reaction per sender and removes on empty emoji', () => {
    const a = applyReaction([], '\u{1F44D}', 'customer');
    const b = applyReaction(a, '\u{1F602}', 'customer');
    expect(b).toEqual([{ emoji: '\u{1F602}', from: 'customer' }]);
    expect(applyReaction(b, '', 'customer')).toEqual([]);
    expect(parseReactions('not json')).toEqual([]);
  });
});

describe('star', () => {
  it('toggles when no value is sent and sets the value when one is', async () => {
    prismaMock.chatMessage.findUnique.mockResolvedValue({ id: 'm1', starred: false });
    prismaMock.chatMessage.update.mockResolvedValue({ id: 'm1', starred: true });
    await starMessage(req('/api/chat/messages/m1', 'PATCH', {}), ctx('m1'));
    expect(prismaMock.chatMessage.update.mock.calls[0][0].data).toEqual({ starred: true });
    await starMessage(req('/api/chat/messages/m1', 'PATCH', { starred: false }), ctx('m1'));
    expect(prismaMock.chatMessage.update.mock.calls[1][0].data).toEqual({ starred: false });
  });

  it('the Starred view asks for starred messages only', async () => {
    prismaMock.contact.findUnique.mockResolvedValue({ id: 'c1', phoneNumber: '+15550001' });
    await listChats(req('/api/chat?contactId=c1&starred=1'));
    expect(prismaMock.chatMessage.findMany.mock.calls[0][0].where.starred).toBe(true);
  });
});

describe('chat helpers', () => {
  it('maps message status to ticks and the header status line', () => {
    expect(tickState('READ')).toBe('read');
    expect(tickState('DELIVERED')).toBe('delivered');
    expect(tickState('SENT')).toBe('sent');
    expect(replyStatusLine(true)).toBe('You can reply freely');
    expect(replyStatusLine(false)).toBe('Use a template to reply');
  });

  it('labels days for the chips between days', () => {
    const now = new Date('2026-03-10T12:00:00');
    expect(dayLabel(new Date('2026-03-10T08:00:00'), now)).toBe('Today');
    expect(dayLabel(new Date('2026-03-09T23:00:00'), now)).toBe('Yesterday');
  });
});
