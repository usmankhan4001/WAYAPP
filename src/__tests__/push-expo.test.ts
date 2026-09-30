import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    pushSubscription: { findMany: vi.fn(), deleteMany: vi.fn(), delete: vi.fn() },
    conversation: { findUnique: vi.fn(), aggregate: vi.fn() },
    settings: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn(), generateVAPIDKeys: () => ({ publicKey: 'p', privateKey: 'k' }) },
}));

import { sendPushNotification, isInQuietHours } from '@/lib/push';

const sub = (i: number, extra: object = {}) => ({
  id: `s${i}`, endpoint: `ExponentPushToken[${i}]`, expoToken: `ExponentPushToken[${i}]`,
  p256dh: null, auth: null, muted: false, quietStart: null, quietEnd: null, ...extra,
});
const okTickets = (n: number) => ({ json: async () => ({ data: Array.from({ length: n }, () => ({ status: 'ok' })) }) });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  process.env.VAPID_PRIVATE_KEY = 'k';
  process.env.VAPID_PUBLIC_KEY = 'p';
  process.env.BUSINESS_TZ = 'Asia/Dubai';
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  prismaMock.conversation.findUnique.mockResolvedValue({ id: 'conv1' });
  prismaMock.conversation.aggregate.mockResolvedValue({ _sum: { unreadCount: 7 } });
});
afterEach(() => vi.useRealTimers());

describe('sendPushNotification (Expo)', () => {
  it('batches at 100 per request and includes data, channel and badge', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue(Array.from({ length: 250 }, (_, i) => sub(i)));
    fetchMock.mockImplementation(async (_u: string, init: any) => okTickets(JSON.parse(init.body).length));
    await sendPushNotification(null, { title: 't', body: 'b', url: '/inbox?contactId=c9' });
    const sizes = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).length);
    expect(sizes).toEqual([100, 100, 50]);
    const first = JSON.parse(fetchMock.mock.calls[0][1].body)[0];
    expect(first).toMatchObject({ channelId: 'messages', sound: 'default', badge: 7, data: { contactId: 'c9', conversationId: 'conv1' } });
  });

  it('skips muted subscriptions', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([sub(1, { muted: true }), sub(2)]);
    fetchMock.mockResolvedValue(okTickets(1));
    await sendPushNotification(null, { title: 't', body: 'b' });
    const msgs = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe('ExponentPushToken[2]');
  });

  it('skips subscriptions inside quiet hours in BUSINESS_TZ', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T08:00:00Z')); // 12:00 in Dubai
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      sub(1, { quietStart: 11, quietEnd: 13 }), // inside
      sub(2, { quietStart: 22, quietEnd: 7 }), // overnight, outside
    ]);
    fetchMock.mockResolvedValue(okTickets(1));
    await sendPushNotification(null, { title: 't', body: 'b' });
    const msgs = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(msgs.map((m: any) => m.to)).toEqual(['ExponentPushToken[2]']);
  });

  it('deletes tokens Expo reports as DeviceNotRegistered', async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([sub(1), sub(2)]);
    fetchMock.mockResolvedValue({
      json: async () => ({ data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }] }),
    });
    await sendPushNotification(null, { title: 't', body: 'b' });
    expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['s2'] } } });
  });
});

describe('isInQuietHours', () => {
  it('same-day window', () => {
    expect(isInQuietHours(13, 12, 14)).toBe(true);
    expect(isInQuietHours(14, 12, 14)).toBe(false);
  });
  it('overnight window 22 -> 7', () => {
    expect(isInQuietHours(23, 22, 7)).toBe(true);
    expect(isInQuietHours(3, 22, 7)).toBe(true);
    expect(isInQuietHours(7, 22, 7)).toBe(false);
    expect(isInQuietHours(12, 22, 7)).toBe(false);
  });
  it('unset or equal bounds means off', () => {
    expect(isInQuietHours(3, null, null)).toBe(false);
    expect(isInQuietHours(3, 5, 5)).toBe(false);
  });
});
