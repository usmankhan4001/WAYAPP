import { describe, it, expect } from 'vitest';
import { GET as socialGet } from '@/app/api/webhooks/meta-social/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe('Meta Social Webhook (Instagram & Messenger)', () => {
  it('should respond to hub.challenge verification handshake', async () => {
    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: { webhookVerifyToken: 'whatsapp_wati_webhook_secret_2026' },
      create: { id: 'default', webhookVerifyToken: 'whatsapp_wati_webhook_secret_2026' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/webhooks/meta-social?hub.mode=subscribe&hub.verify_token=${settings.webhookVerifyToken}&hub.challenge=test_challenge_123`
    );

    const res = await socialGet(req);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('test_challenge_123');
  });

  it('should reject invalid verify token with 403', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/webhooks/meta-social?hub.mode=subscribe&hub.verify_token=invalid_secret&hub.challenge=test_challenge_123'
    );

    const res = await socialGet(req);
    expect(res.status).toBe(403);
  });
});
