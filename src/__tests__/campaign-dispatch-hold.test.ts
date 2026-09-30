import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { prismaMock, dispatchSpy } = vi.hoisted(() => ({
  prismaMock: {
    campaign: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  },
  dispatchSpy: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/whatsapp/client', () => ({ WhatsAppClient: { createFromSettings: vi.fn() } }));
vi.mock('@/worker/dispatcher', async (orig) => {
  const actual = await orig<typeof import('@/worker/dispatcher')>();
  return { ...actual, dispatchCampaign: dispatchSpy };
});

import { pollScheduledCampaigns } from '@/worker/scheduler';
import { campaignDispatchEnabled } from '@/lib/feature-gates';

describe('campaign dispatch hold', () => {
  const original = process.env.CAMPAIGN_DISPATCH;
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.campaign.findMany.mockResolvedValue([{ id: 'c1', name: 'Due' }]);
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CAMPAIGN_DISPATCH;
    else process.env.CAMPAIGN_DISPATCH = original;
  });

  it('is held unless CAMPAIGN_DISPATCH is exactly "on"', () => {
    delete process.env.CAMPAIGN_DISPATCH;
    expect(campaignDispatchEnabled()).toBe(false);
    process.env.CAMPAIGN_DISPATCH = 'true';
    expect(campaignDispatchEnabled()).toBe(false);
    process.env.CAMPAIGN_DISPATCH = 'ON';
    expect(campaignDispatchEnabled()).toBe(true);
  });

  it('the scheduler leaves a due SCHEDULED campaign untouched while held', async () => {
    delete process.env.CAMPAIGN_DISPATCH;
    await pollScheduledCampaigns();
    expect(prismaMock.campaign.findMany).not.toHaveBeenCalled();
    expect(prismaMock.campaign.update).not.toHaveBeenCalled();
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('the scheduler dispatches a due campaign once enabled', async () => {
    process.env.CAMPAIGN_DISPATCH = 'on';
    await pollScheduledCampaigns();
    expect(prismaMock.campaign.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { status: 'QUEUED' } });
    expect(dispatchSpy).toHaveBeenCalledWith('c1');
  });
});

describe('dispatchCampaign itself', () => {
  it('refuses before touching the campaign when held (covers the sweeper and the API route)', async () => {
    vi.resetModules();
    delete process.env.CAMPAIGN_DISPATCH;
    vi.doUnmock('@/worker/dispatcher');
    const { dispatchCampaign } = await import('@/worker/dispatcher');
    const result = await dispatchCampaign('c1');
    expect(result).toEqual({ success: false, error: 'Campaign dispatch is disabled' });
    expect(prismaMock.campaign.updateMany).not.toHaveBeenCalled();
  });
});
