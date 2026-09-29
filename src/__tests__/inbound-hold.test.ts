import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { processInboundFlow, processInboundBot, processInboundAutomation, enqueueOutboundWebhook } = vi.hoisted(() => ({
  processInboundFlow: vi.fn().mockResolvedValue(false),
  processInboundBot: vi.fn().mockResolvedValue(false),
  processInboundAutomation: vi.fn().mockResolvedValue(undefined),
  enqueueOutboundWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/worker/flows', () => ({ processInboundFlow }));
vi.mock('@/worker/bots', () => ({ processInboundBot }));
vi.mock('@/lib/whatsapp/automation', () => ({ processInboundAutomation }));
vi.mock('@/worker/outbound-webhooks', () => ({ enqueueOutboundWebhook }));

import { processInboundEvent, inboundAutomationsEnabled } from '@/worker/inbound-events';

const event = {
  contactId: 'c1',
  conversationId: 'v1',
  phoneNumber: '+15550000000',
  wamid: 'w1',
  bodyText: 'Call',
  messageType: 'text',
  timestamp: new Date(),
};

describe('inbound automation hold', () => {
  const original = process.env.INBOUND_AUTOMATIONS;
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    if (original === undefined) delete process.env.INBOUND_AUTOMATIONS;
    else process.env.INBOUND_AUTOMATIONS = original;
  });

  it('holds flows, bots and automations by default but still emits the webhook', async () => {
    delete process.env.INBOUND_AUTOMATIONS;
    expect(inboundAutomationsEnabled()).toBe(false);
    await processInboundEvent(event as any);
    expect(enqueueOutboundWebhook).toHaveBeenCalledWith('message.received', expect.objectContaining({ body: 'Call' }));
    expect(processInboundFlow).not.toHaveBeenCalled();
    expect(processInboundBot).not.toHaveBeenCalled();
    expect(processInboundAutomation).not.toHaveBeenCalled();
  });

  it('runs the engines when INBOUND_AUTOMATIONS=on', async () => {
    process.env.INBOUND_AUTOMATIONS = 'on';
    expect(inboundAutomationsEnabled()).toBe(true);
    await processInboundEvent(event as any);
    expect(processInboundFlow).toHaveBeenCalledTimes(1);
    expect(processInboundBot).toHaveBeenCalledTimes(1);
    expect(processInboundAutomation).toHaveBeenCalledTimes(1);
  });

  it('treats any other value as held', () => {
    process.env.INBOUND_AUTOMATIONS = 'true';
    expect(inboundAutomationsEnabled()).toBe(false);
  });
});
