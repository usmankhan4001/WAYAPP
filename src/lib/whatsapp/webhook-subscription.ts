/**
 * Checks and repairs where Meta delivers incoming WhatsApp messages.
 *
 * Meta keeps ONE callback URL per app. Anything that re-registers or removes it (another
 * tool, a workflow being republished) silently stops incoming messages from reaching WayApp,
 * and nothing in WayApp notices. This reads the subscription Meta currently holds and can set
 * it back to this app's webhook, so nobody has to open the Meta dashboard to fix it.
 *
 * Uses the app access token "<appId>|<appSecret>". Never throws; every failure comes back as
 * a plain-language reason.
 */
const GRAPH = 'https://graph.facebook.com/v21.0'
const OBJECT = 'whatsapp_business_account'

export type SubscriptionStatus =
  | { ok: true; registered: boolean; callbackUrl: string | null; matches: boolean; hasMessages: boolean }
  | { ok: false; reason: string }

function appToken(appId: string, appSecret: string) {
  return `${appId}|${appSecret}`
}

async function graph(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000), cache: 'no-store' })
    const body = (await res.json().catch(() => null)) as any
    return { ok: res.ok, status: res.status, body }
  } catch (err: any) {
    return { ok: false, status: 0, body: { error: { message: err?.message || 'Could not reach Meta' } } }
  }
}

function reasonFrom(res: { status: number; body: any }) {
  const msg = res.body?.error?.message
  if (res.status === 0) return 'Could not reach Meta. Check the server connection and try again.'
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    return `Meta did not accept the App ID and App Secret${msg ? ` (${msg})` : ''}. Check both in Settings.`
  }
  return msg ? `Meta said: ${msg}` : `Meta returned an error (${res.status}).`
}

export async function getSubscriptionStatus(input: {
  appId: string
  appSecret: string
  expectedCallbackUrl: string
}): Promise<SubscriptionStatus> {
  const { appId, appSecret, expectedCallbackUrl } = input
  const res = await graph(`${GRAPH}/${encodeURIComponent(appId)}/subscriptions?access_token=${encodeURIComponent(appToken(appId, appSecret))}`)
  if (!res.ok) return { ok: false, reason: reasonFrom(res) }
  const list: any[] = Array.isArray(res.body?.data) ? res.body.data : []
  const sub = list.find((s) => s?.object === OBJECT)
  if (!sub) return { ok: true, registered: false, callbackUrl: null, matches: false, hasMessages: false }
  const callbackUrl = typeof sub.callback_url === 'string' ? sub.callback_url : null
  const fields: any[] = Array.isArray(sub.fields) ? sub.fields : []
  return {
    ok: true,
    registered: true,
    callbackUrl,
    matches: callbackUrl === expectedCallbackUrl,
    hasMessages: fields.some((f) => (typeof f === 'string' ? f : f?.name) === 'messages'),
  }
}

export async function registerWebhook(input: {
  appId: string
  appSecret: string
  callbackUrl: string
  verifyToken: string
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { appId, appSecret, callbackUrl, verifyToken } = input
  const body = new URLSearchParams({
    object: OBJECT,
    callback_url: callbackUrl,
    verify_token: verifyToken,
    fields: 'messages',
    access_token: appToken(appId, appSecret),
  })
  const res = await graph(`${GRAPH}/${encodeURIComponent(appId)}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok || res.body?.success === false) {
    return { ok: false, reason: reasonFrom(res) }
  }
  return { ok: true }
}

/** Makes sure the WhatsApp Business Account itself is subscribed to this app. Best effort. */
export async function subscribeWaba(input: { wabaId: string; accessToken: string }): Promise<boolean> {
  const res = await graph(`${GRAPH}/${encodeURIComponent(input.wabaId)}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.accessToken}` },
  })
  return res.ok
}
