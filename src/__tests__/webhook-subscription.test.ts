import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSubscriptionStatus, registerWebhook } from '@/lib/whatsapp/webhook-subscription';

const URL_OK = 'https://whatsapp.example.com/api/webhooks/whatsapp';
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const bad = (status: number, message: string) => ({ ok: false, status, json: async () => ({ error: { message } }) });

describe('webhook subscription check and repair', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports registered, matching and subscribed to messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ data: [{ object: 'whatsapp_business_account', callback_url: URL_OK, fields: [{ name: 'messages' }] }] })));
    expect(await getSubscriptionStatus({ appId: '1', appSecret: 's', expectedCallbackUrl: URL_OK })).toEqual({
      ok: true, registered: true, callbackUrl: URL_OK, matches: true, hasMessages: true,
    });
  });

  it('reports nothing registered when Meta holds no subscription (the empty Callback URL case)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ data: [] })));
    expect(await getSubscriptionStatus({ appId: '1', appSecret: 's', expectedCallbackUrl: URL_OK })).toMatchObject({
      ok: true, registered: false, matches: false,
    });
  });

  it('reports a different address as not matching', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ data: [{ object: 'whatsapp_business_account', callback_url: 'https://other.example.com/x', fields: ['messages'] }] })));
    expect(await getSubscriptionStatus({ appId: '1', appSecret: 's', expectedCallbackUrl: URL_OK })).toMatchObject({
      registered: true, matches: false, hasMessages: true,
    });
  });

  it('turns a rejected app secret into a plain reason', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(bad(400, 'Invalid OAuth access token')));
    const r = await getSubscriptionStatus({ appId: '1', appSecret: 'wrong', expectedCallbackUrl: URL_OK });
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toContain('App ID and App Secret');
  });

  it('registers with the verify token and messages field', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await registerWebhook({ appId: '1', appSecret: 's', callbackUrl: URL_OK, verifyToken: 'tok' })).toEqual({ ok: true });
    const body = String(fetchMock.mock.calls[0][1].body);
    expect(body).toContain('callback_url=' + encodeURIComponent(URL_OK));
    expect(body).toContain('verify_token=tok');
    expect(body).toContain('fields=messages');
  });

  it('never throws when Meta is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const r = await registerWebhook({ appId: '1', appSecret: 's', callbackUrl: URL_OK, verifyToken: 't' });
    expect(r.ok).toBe(false);
  });
});
