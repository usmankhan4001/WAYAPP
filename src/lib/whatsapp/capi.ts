import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createHash } from 'crypto';

function sha256(val: string): string {
  return createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

export interface MetaCapiEventParams {
  eventName: 'Lead' | 'QualifiedLead' | 'Schedule' | 'Purchase' | 'InitiateCheckout' | 'Contact';
  contactId?: string;
  phoneNumber: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  value?: number;
  currency?: string;
  campaignId?: string;
  customData?: Record<string, any>;
}

/**
 * Sends a server-side conversion event directly to Meta Conversions API (CAPI)
 * for Click-to-WhatsApp Ads attribution with 0% middleware latency.
 */
export async function sendMetaConversionEvent(params: MetaCapiEventParams): Promise<{ success: boolean; eventId?: string }> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    const pixelId = process.env.META_PIXEL_ID || settings?.wabaId;
    const { decryptString } = await import('@/lib/crypto');
    const accessToken = decryptString(settings?.accessToken) || process.env.META_ACCESS_TOKEN;

    if (!pixelId || !accessToken || settings?.isMockMode) {
      // Record conversion event locally in DB
      await prisma.conversionEvent.create({
        data: {
          contactId: params.contactId || null,
          campaignId: params.campaignId || null,
          eventName: params.eventName,
          value: params.value || 0,
          currency: params.currency || 'USD',
          metadata: JSON.stringify(params.customData || {}),
        },
      }).catch(() => {});

      logger.info({ event: params.eventName, phone: params.phoneNumber }, 'Meta CAPI simulated successfully in local mode');
      return { success: true, eventId: `sim_${Date.now()}` };
    }

    const normalizedPhone = params.phoneNumber.replace(/\D/g, '');
    const user_data: any = {
      ph: [sha256(normalizedPhone)],
    };

    if (params.email) user_data.em = [sha256(params.email)];
    if (params.firstName) user_data.fn = [sha256(params.firstName)];
    if (params.lastName) user_data.ln = [sha256(params.lastName)];

    const payload = {
      data: [
        {
          event_name: params.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'business_messaging',
          messaging_channel: 'whatsapp',
          user_data,
          custom_data: {
            currency: params.currency || 'USD',
            value: params.value || 0,
            ...(params.customData || {}),
          },
        },
      ],
    };

    const endpoint = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      logger.warn({ error: data.error }, 'Meta CAPI request error');
    }

    // Persist locally in DB
    await prisma.conversionEvent.create({
      data: {
        contactId: params.contactId || null,
        campaignId: params.campaignId || null,
        eventName: params.eventName,
        value: params.value || 0,
        currency: params.currency || 'USD',
        metadata: JSON.stringify({ metaResponse: data }),
      },
    }).catch(() => {});

    return { success: true, eventId: data.events_received ? `capi_${Date.now()}` : undefined };
  } catch (error: any) {
    logger.error({ error }, 'Failed to dispatch Meta CAPI event');
    return { success: false };
  }
}
