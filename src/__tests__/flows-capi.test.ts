import { describe, it, expect } from 'vitest';
import { POST as flowsPost } from '@/app/api/webhooks/flows/route';
import { sendMetaConversionEvent } from '@/lib/whatsapp/capi';
import { setModuleEnabled } from '@/lib/modules';
import { NextRequest } from 'next/server';

describe('WhatsApp Flows 3.0 & Meta CAPI', () => {
  it('should respond to flow ping healthcheck', async () => {
    await setModuleEnabled('whatsapp_flows', true);

    const req = new NextRequest('http://localhost:3000/api/webhooks/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping' }),
    });

    const res = await flowsPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.version).toBe('3.0');
    expect(data.data.status).toBe('active');
  });

  it('should dispatch server-side Meta CAPI conversion event', async () => {
    const result = await sendMetaConversionEvent({
      eventName: 'Lead',
      phoneNumber: '+971501234567',
      email: 'lead@example.com',
      firstName: 'Omar',
      value: 500,
      currency: 'USD',
    });

    expect(result.success).toBe(true);
    expect(result.eventId).toBeDefined();
  });
});
