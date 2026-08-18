import { prisma } from '@/lib/prisma';
import {
  MetaSendResponse,
  MetaTemplateResponse,
  SendTemplateMessageParams,
} from './types';

const META_GRAPH_VERSION = 'v21.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export class WhatsAppClient {
  private wabaId: string | null = null;
  private phoneNumberId: string | null = null;
  private accessToken: string | null = null;
  private isMockMode: boolean = false;

  constructor(config?: {
    wabaId?: string | null;
    phoneNumberId?: string | null;
    accessToken?: string | null;
    isMockMode?: boolean;
  }) {
    if (config) {
      this.wabaId = config.wabaId || null;
      this.phoneNumberId = config.phoneNumberId || null;
      this.accessToken = config.accessToken || null;
      this.isMockMode = config.isMockMode ?? false;
    }
  }

  /**
   * Initializes client by reading current settings from DB
   */
  static async createFromSettings(): Promise<WhatsAppClient> {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    return new WhatsAppClient({
      wabaId: settings?.wabaId,
      phoneNumberId: settings?.phoneNumberId,
      accessToken: settings?.accessToken,
      isMockMode: settings?.isMockMode ?? (!settings?.accessToken || !settings?.phoneNumberId),
    });
  }

  /**
   * Test connection to Meta Graph API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    phoneDetails?: any;
    wabaDetails?: any;
  }> {
    if (this.isMockMode || !this.accessToken || !this.phoneNumberId) {
      return {
        success: true,
        message: 'Mock Mode Active: Virtual WhatsApp Cloud connection simulated successfully.',
        phoneDetails: {
          display_phone_number: '+1 (555) 019-2834',
          verified_name: 'Verified Business Test Account',
          quality_rating: 'GREEN',
          messaging_tier: 'TIER_10K',
        },
      };
    }

    try {
      // 1. Check Phone Number info
      const phoneRes = await fetch(
        `${META_GRAPH_URL}/${this.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const phoneData = await phoneRes.json();
      if (!phoneRes.ok || phoneData.error) {
        return {
          success: false,
          message: `Phone Number ID error: ${phoneData.error?.message || phoneRes.statusText}`,
        };
      }

      return {
        success: true,
        message: 'Meta WhatsApp Cloud API connected successfully!',
        phoneDetails: phoneData,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Network or API Error: ${err.message}`,
      };
    }
  }

  /**
   * Fetch approved/pending message templates from Meta WABA
   */
  async fetchTemplates(): Promise<MetaTemplateResponse[]> {
    if (this.isMockMode || !this.accessToken || !this.wabaId) {
      // Return realistic mock templates
      return [
        {
          id: 'tpl_welcome_promo',
          name: 'welcome_offer_promo',
          language: 'en_US',
          status: 'APPROVED',
          category: 'MARKETING',
          components: [
            {
              type: 'HEADER',
              format: 'IMAGE',
              text: 'Special Welcome Discount',
            },
            {
              type: 'BODY',
              text: 'Hi {{1}}, thank you for contacting {{2}}! Use your exclusive coupon code {{3}} for 25% off your first order.',
              example: {
                body_text: [['John', 'Our Store', 'WELCOME25']],
              },
            },
            {
              type: 'FOOTER',
              text: 'Reply STOP to opt out',
            },
            {
              type: 'BUTTONS',
              buttons: [
                {
                  type: 'URL',
                  text: 'Claim Offer Online',
                  url: 'https://example.com/claim',
                },
                {
                  type: 'QUICK_REPLY',
                  text: 'Talk to Agent',
                },
              ],
            },
          ],
        },
        {
          id: 'tpl_order_update',
          name: 'order_status_notification',
          language: 'en_US',
          status: 'APPROVED',
          category: 'UTILITY',
          components: [
            {
              type: 'HEADER',
              format: 'TEXT',
              text: 'Order Status Update #{{1}}',
            },
            {
              type: 'BODY',
              text: 'Hello {{1}}, your order #{{2}} has been confirmed and is being prepared. Expected delivery: {{3}}.',
              example: {
                body_text: [['Sarah', 'ORD-9842', 'Tomorrow, 5:00 PM']],
              },
            },
            {
              type: 'FOOTER',
              text: 'Thank you for choosing us!',
            },
            {
              type: 'BUTTONS',
              buttons: [
                {
                  type: 'URL',
                  text: 'Track Live Status',
                  url: 'https://example.com/track/{{1}}',
                },
              ],
            },
          ],
        },
        {
          id: 'tpl_vip_invitation',
          name: 'vip_exclusive_event_invite',
          language: 'en_US',
          status: 'APPROVED',
          category: 'MARKETING',
          components: [
            {
              type: 'HEADER',
              format: 'TEXT',
              text: 'Exclusive VIP Invitation',
            },
            {
              type: 'BODY',
              text: 'Dear {{1}}, you are cordially invited to our exclusive private preview event in {{2}} on {{3}}.',
              example: {
                body_text: [['Ahmed', 'Dubai Marina', 'Friday, 8:00 PM']],
              },
            },
            {
              type: 'FOOTER',
              text: 'Limited seating available',
            },
            {
              type: 'BUTTONS',
              buttons: [
                {
                  type: 'QUICK_REPLY',
                  text: 'RSVP Yes',
                },
                {
                  type: 'QUICK_REPLY',
                  text: 'Cannot Attend',
                },
              ],
            },
          ],
        },
      ];
    }

    try {
      const response = await fetch(
        `${META_GRAPH_URL}/${this.wabaId}/message_templates?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to fetch templates from Meta');
      }

      return data.data as MetaTemplateResponse[];
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      throw err;
    }
  }

  /**
   * Create a new message template on Meta
   */
  async createTemplate(params: {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    components: any[];
  }): Promise<{ id: string; status: string }> {
    if (this.isMockMode || !this.accessToken || !this.wabaId) {
      return {
        id: `mock_tpl_${Date.now()}`,
        status: 'APPROVED',
      };
    }

    const response = await fetch(`${META_GRAPH_URL}/${this.wabaId}/message_templates`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Failed to create template on Meta');
    }

    return {
      id: data.id,
      status: data.status || 'PENDING',
    };
  }

  /**
   * Send a WhatsApp template message to a single recipient
   */
  async sendTemplateMessage(params: SendTemplateMessageParams): Promise<MetaSendResponse> {
    const cleanPhone = params.to.replace(/[^0-9]/g, '');

    if (this.isMockMode || !this.accessToken || !this.phoneNumberId) {
      // Realistic simulated Meta Cloud API Response
      const fakeWamid = `wamid.HBgL${Date.now()}X${Math.random().toString(36).substring(2, 9).toUpperCase()}A`;
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: params.to, wa_id: cleanPhone }],
        messages: [{ id: fakeWamid, message_status: 'accepted' }],
      };
    }

    const componentsPayload: any[] = [];

    // Header media or text parameters
    if (params.headerMediaUrl) {
      componentsPayload.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { link: params.headerMediaUrl },
          },
        ],
      });
    } else if (params.headerVariables && params.headerVariables.length > 0) {
      componentsPayload.push({
        type: 'header',
        parameters: params.headerVariables.map((val) => ({
          type: 'text',
          text: String(val || ''),
        })),
      });
    }

    // Body parameters
    if (params.bodyVariables && params.bodyVariables.length > 0) {
      componentsPayload.push({
        type: 'body',
        parameters: params.bodyVariables.map((val) => ({
          type: 'text',
          text: String(val || ''),
        })),
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: params.templateName,
        language: {
          code: params.languageCode || 'en_US',
        },
        components: componentsPayload.length > 0 ? componentsPayload : undefined,
      },
    };

    const response = await fetch(`${META_GRAPH_URL}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || response.statusText;
      const errorCode = data.error?.code || response.status;
      const err = new Error(errorMsg);
      (err as any).code = errorCode;
      (err as any).metaData = data.error;
      throw err;
    }

    return data as MetaSendResponse;
  }

  /**
   * Send 2-Way Freeform Text message (within 24h conversation window)
   */
  async sendTextMessage(to: string, text: string): Promise<MetaSendResponse> {
    const cleanPhone = to.replace(/[^0-9]/g, '');

    if (this.isMockMode || !this.accessToken || !this.phoneNumberId) {
      const fakeWamid = `wamid.HBgL${Date.now()}X${Math.random().toString(36).substring(2, 9).toUpperCase()}A`;
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: to, wa_id: cleanPhone }],
        messages: [{ id: fakeWamid, message_status: 'accepted' }],
      };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    const response = await fetch(`${META_GRAPH_URL}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || response.statusText;
      const errorCode = data.error?.code || response.status;
      const err = new Error(errorMsg);
      (err as any).code = errorCode;
      throw err;
    }

    return data as MetaSendResponse;
  }
}
