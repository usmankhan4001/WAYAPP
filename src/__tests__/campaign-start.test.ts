import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    campaign: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    template: { findUnique: vi.fn() },
    contact: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/auth/rbac', () => ({
  requireRole: vi.fn().mockResolvedValue({ session: { userId: 'u1', role: 'ADMIN' } }),
  requireAuth: vi.fn().mockResolvedValue({ session: { userId: 'u1', role: 'ADMIN' } }),
}));

import { POST as dispatch } from '@/app/api/campaigns/[id]/dispatch/route';

const call = (action: string) =>
  dispatch(
    new NextRequest('http://localhost/api/campaigns/c1/dispatch', {
      method: 'POST',
      body: JSON.stringify({ action }),
      headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ id: 'c1' }) }
  );

describe('Start / Resume on a broadcast', () => {
  const original = process.env.CAMPAIGN_DISPATCH;
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.campaign.findUnique.mockResolvedValue({ id: 'c1', templateId: 't1', status: 'DRAFT' });
    prismaMock.template.findUnique.mockResolvedValue({ status: 'APPROVED' });
    prismaMock.campaign.updateMany.mockResolvedValue({ count: 1 });
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CAMPAIGN_DISPATCH;
    else process.env.CAMPAIGN_DISPATCH = original;
  });

  it('is refused and changes nothing while sending is switched off', async () => {
    delete process.env.CAMPAIGN_DISPATCH;
    const res = await call('START');
    expect(res.status).toBe(409);
    expect(prismaMock.campaign.updateMany).not.toHaveBeenCalled();
  });

  it('queues the broadcast for the worker scheduler when sending is on', async () => {
    process.env.CAMPAIGN_DISPATCH = 'on';
    const res = await call('START');
    expect(await res.json()).toEqual({ success: true, status: 'SCHEDULED' });
    const arg = prismaMock.campaign.updateMany.mock.calls[0][0];
    expect(arg.where.status.in).toEqual(['DRAFT', 'PAUSED', 'SCHEDULED']);
    expect(arg.data.status).toBe('SCHEDULED');
    expect(arg.data.scheduledAt).toBeInstanceOf(Date);
  });

  it('refuses a template Meta has not approved', async () => {
    process.env.CAMPAIGN_DISPATCH = 'on';
    prismaMock.template.findUnique.mockResolvedValue({ status: 'PENDING' });
    const res = await call('START');
    expect(res.status).toBe(400);
    expect(prismaMock.campaign.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a broadcast that is already running or finished', async () => {
    process.env.CAMPAIGN_DISPATCH = 'on';
    prismaMock.campaign.updateMany.mockResolvedValue({ count: 0 });
    const res = await call('RESUME');
    expect(res.status).toBe(409);
  });

  it('still lets Pause and Cancel through while sending is off', async () => {
    delete process.env.CAMPAIGN_DISPATCH;
    expect((await call('PAUSE')).status).toBe(200);
    expect((await call('CANCEL')).status).toBe(200);
  });
});
