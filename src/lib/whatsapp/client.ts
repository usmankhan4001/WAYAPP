import { prisma } from '@/lib/prisma';
import {
  MetaSendResponse,
  MetaTemplateResponse,
  SendTemplateMessageParams,
  SendMediaMessageParams,
  SendListMessageParams,
  SendButtonMessageParams,
} from './types';

const META_GRAPH_VERSION = 'v21.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const FETCH_TIMEOUT_MS = 15_000;

/** fetch wrapper that always aborts after FETCH_TIMEOUT_MS */
async function metaFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

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
   * Throws when a real (non-mock) Meta call is attempted without configured
   * credentials. Removes the silent fail-open that previously faked success
   * for unconfigured instances.
   */
  private assertRealConnection(action: string): void {
    if (!this.accessToken) {
      throw new Error(
        `[WhatsApp] Cannot ${action}: Meta access token is not configured. Open API & Settings and connect your WhatsApp Business Account.`
      );
    }
    if (!this.phoneNumberId) {
      throw new Error(
        `[WhatsApp] Cannot ${action}: Phone Number ID is not configured. Open API & Settings and connect your WhatsApp Business Account.`
      );
    }
  }

  /**
   * Initializes client by reading current settings from DB.
   * (Bootstrap/migrations are owned by the entrypoint + settings route; this
   * path only reads settings and never runs DDL.)
   */
  static async createFromSettings(): Promise<WhatsAppClient> {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    const { decryptString } = await import('@/lib/crypto');
    const decryptedToken = decryptString(settings?.accessToken);
    const isMock = settings?.isMockMode === true;

    return new WhatsAppClient({
      wabaId: settings?.wabaId?.trim() || null,
      phoneNumberId: settings?.phoneNumberId?.trim() || null,
      accessToken: decryptedToken?.trim() || null,
      isMockMode: isMock,
    });
  }

  /**
   * Deep diagnostic connection tester for Meta Graph API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    phoneDetails?: any;
    wabaDetails?: any;
    permissions?: string[];
  }> {
    if (this.isMockMode) {
      return {
        success: true,
        message: 'Mock Mode Active: Virtual WhatsApp Cloud connection simulated successfully.',
        phoneDetails: {
          display_phone_number: '+1 (555) 019-2834',
          verified_name: 'Verified Business Test Account',
          quality_rating: 'GREEN',
          messaging_tier: 'TIER_10K',
          status: 'CONNECTED',
        },
        wabaDetails: {
          name: 'Demo Enterprise WABA',
          currency: 'USD',
          account_review_status: 'APPROVED',
        },
      };
    }
    this.assertRealConnection('test the connection');

    try {
      // 1. Check Phone Number info
      const phoneRes = await metaFetch(
        `${META_GRAPH_URL}/${this.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,status,name_status`,
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

      // 2. Check WABA info if WABA ID is provided
      let wabaData: any = null;
      if (this.wabaId) {
        try {
          const wabaRes = await metaFetch(
            `${META_GRAPH_URL}/${this.wabaId}?fields=name,timezone_id,currency,account_review_status`,
            {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
              },
            }
          );
          wabaData = await wabaRes.json();
        } catch {}
      }

      return {
        success: true,
        message: 'Meta WhatsApp Cloud API connected and validated successfully!',
        phoneDetails: phoneData,
        wabaDetails: wabaData && !wabaData.error ? wabaData : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Network or API Error: ${err.message}`,
      };
    }
  }

  /**
   * 1-Click Phone Number 2FA Registration on Meta Cloud API
   */
  async registerPhoneNumber(pin: string = '123456'): Promise<{ success: boolean; message: string }> {
    if (this.isMockMode) {
      return {
        success: true,
        message: 'Mock Mode: Phone number registration simulated successfully.',
      };
    }
    this.assertRealConnection('register the phone number');

    try {
      const response = await metaFetch(`${META_GRAPH_URL}/${this.phoneNumberId}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: pin.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to register phone number with Meta Cloud API');
      }

      return {
        success: true,
        message: 'Phone number registered with Meta Cloud API successfully!',
      };
    } catch (err: any) {
      throw new Error(`Phone Registration Failed: ${err.message}`);
    }
  }

  /**
   * Fetch approved/pending message templates from Meta WABA (paginated)
   */
  async fetchTemplates(): Promise<MetaTemplateResponse[]> {
    if (!this.accessToken) {
      if (this.isMockMode) {
        return this.getMockTemplates();
      }
      throw new Error(
        'Meta credentials missing: Permanent Access Token is required. Please check API & Settings.'
      );
    }

    const wabaId = this.wabaId?.trim();
    if (!wabaId) {
      if (this.isMockMode) return this.getMockTemplates();
      throw new Error(
        'Meta credentials missing: WhatsApp Business Account (WABA) ID is required to fetch templates. Open Meta Developer Portal -> WhatsApp -> API Setup and paste the WABA ID in API & Settings.'
      );
    }

    const templates: MetaTemplateResponse[] = [];
    let nextUrl: string | null = `${META_GRAPH_URL}/${wabaId}/message_templates?fields=name,status,category,language,components,id,quality_score,rejected_reason&limit=250`;
    let lastError: string = '';

    while (nextUrl) {
      try {
        const response = await metaFetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${this.accessToken.trim()}`,
          },
          cache: 'no-store',
        });

        const data = await response.json();
        if (!response.ok || data.error) {
          lastError = data.error?.message || response.statusText;
          break;
        }

        if (Array.isArray(data.data)) {
          templates.push(...data.data.map((t: any) => {
            let qualityScoreStr = 'GREEN';
            if (typeof t.quality_score === 'string') {
              qualityScoreStr = t.quality_score;
            } else if (typeof t.quality_score === 'object' && t.quality_score !== null && t.quality_score.score) {
              qualityScoreStr = String(t.quality_score.score);
            }

            let rejectedReasonStr: string | null = null;
            if (typeof t.rejected_reason === 'string') {
              rejectedReasonStr = t.rejected_reason;
            } else if (typeof t.rejected_reason === 'object' && t.rejected_reason !== null) {
              rejectedReasonStr = JSON.stringify(t.rejected_reason);
            }

            return {
              id: String(t.id),
              name: t.name,
              language: t.language || 'en_US',
              category: t.category || 'MARKETING',
              status: t.status || 'APPROVED',
              components: Array.isArray(t.components) ? t.components : [],
              quality_score: qualityScoreStr,
              rejected_reason: rejectedReasonStr,
            };
          }) as MetaTemplateResponse[]);
        }

        nextUrl = typeof data.paging?.next === 'string' ? data.paging.next : null;
      } catch (err: any) {
        lastError = err.message;
        break;
      }
    }

    if (lastError && templates.length === 0) {
      if (lastError.includes('message_templates') || lastError.includes('nonexisting field')) {
        throw new Error(
          `WABA ID Mismatch: The ID '${wabaId}' is not a WhatsApp Business Account (WABA) ID. Please open Meta Developer Portal -> WhatsApp -> API Setup, copy the 'WhatsApp Business Account ID', and paste it in API & Settings.`
        );
      }
      throw new Error(`Meta Template Sync Failed: ${lastError || 'Failed to fetch templates'}`);
    }

    return templates;
  }

  /**
   * Mock templates helper for offline simulation
   */
  private getMockTemplates(): MetaTemplateResponse[] {
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

  /**
   * Create a new message template on Meta with full Graph API v21.0 compliance
   */
  async createTemplate(params: {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    components: any[];
  }): Promise<{ id: string; status: string }> {
    if (!this.accessToken) {
      if (this.isMockMode) {
        return {
          id: `mock_tpl_${Date.now()}`,
          status: 'APPROVED',
        };
      }
      throw new Error('Permanent Access Token is required to create templates on Meta.');
    }

    const wabaId = this.wabaId?.trim();
    if (!wabaId) {
      if (this.isMockMode) {
        return { id: `mock_tpl_${Date.now()}`, status: 'APPROVED' };
      }
      throw new Error('WhatsApp Business Account ID (WABA ID) is required to create templates.');
    }

    // Format components to strict Meta Graph API v21.0 requirements
    const formattedComponents: any[] = [];

    for (const comp of (params.components || [])) {
      if (comp.type === 'HEADER') {
        if (comp.format === 'TEXT' && comp.text && comp.text.trim()) {
          const headerObj: any = {
            type: 'HEADER',
            format: 'TEXT',
            text: comp.text.trim(),
          };
          const varMatches = comp.text.match(/{{\d+}}/g) || [];
          if (varMatches.length > 0) {
            headerObj.example = {
              header_text: varMatches.map((_: string, idx: number) => `Header_${idx + 1}`),
            };
          }
          formattedComponents.push(headerObj);
        } else if (comp.format === 'IMAGE') {
          // If valid header_handle exists, send it; otherwise skip or fallback
          if (comp.example?.header_handle && comp.example.header_handle.length > 0) {
            formattedComponents.push({
              type: 'HEADER',
              format: 'IMAGE',
              example: comp.example,
            });
          }
        }
      } else if (comp.type === 'BODY') {
        const bodyText = (comp.text || '').trim();
        if (bodyText) {
          const bodyObj: any = {
            type: 'BODY',
            text: bodyText,
          };
          const varMatches = bodyText.match(/{{\d+}}/g) || [];
          if (varMatches.length > 0) {
            bodyObj.example = {
              body_text: [
                varMatches.map((_: string, idx: number) => `Sample_${idx + 1}`),
              ],
            };
          }
          formattedComponents.push(bodyObj);
        }
      } else if (comp.type === 'FOOTER') {
        const footerText = (comp.text || '').trim();
        if (footerText) {
          formattedComponents.push({
            type: 'FOOTER',
            text: footerText,
          });
        }
      } else if (comp.type === 'BUTTONS') {
        const validButtons = (comp.buttons || [])
          .filter((b: any) => b && b.text && b.text.trim())
          .map((btn: any) => {
            const b: any = { type: btn.type, text: btn.text.trim() };
            if (btn.type === 'URL') {
              b.url = (btn.url || 'https://example.com').trim();
              if (b.url.includes('{{1}}')) {
                b.example = ['https://example.com/sample_item'];
              }
            } else if (btn.type === 'PHONE_NUMBER') {
              b.phone_number = (btn.phone_number || '+1234567890').trim();
            }
            return b;
          });

        if (validButtons.length > 0) {
          formattedComponents.push({
            type: 'BUTTONS',
            buttons: validButtons,
          });
        }
      }
    }

    const payload = {
      name: params.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category: params.category || 'MARKETING',
      language: params.language || 'en_US',
      components: formattedComponents,
    };

    let lastError: string = '';

    try {
      const response = await metaFetch(`${META_GRAPH_URL}/${wabaId}/message_templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok && !data.error && data.id) {
        return {
          id: String(data.id),
          status: data.status || 'PENDING',
        };
      }
      lastError = data.error?.message || response.statusText;
    } catch (err: any) {
      lastError = err.message;
    }

    throw new Error(`Meta Template Creation Failed: ${lastError || 'Invalid parameter'}`);
  }

  /**
   * Send a WhatsApp template message to a single recipient
   */
  async sendTemplateMessage(params: SendTemplateMessageParams): Promise<MetaSendResponse> {
    const cleanPhone = params.to.replace(/[^0-9]/g, '');

    if (this.isMockMode) {
      // Realistic simulated Meta Cloud API Response
      const fakeWamid = `wamid.HBgL${Date.now()}X${Math.random().toString(36).substring(2, 9).toUpperCase()}A`;
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: params.to, wa_id: cleanPhone }],
        messages: [{ id: fakeWamid, message_status: 'accepted' }],
      };
    }
    this.assertRealConnection('send a template message');

    const componentsPayload: any[] = [];

    let parsedComponents: any[] = [];
    if (params.templateComponents) {
      try {
        parsedComponents =
          typeof params.templateComponents === 'string'
            ? JSON.parse(params.templateComponents)
            : params.templateComponents;
      } catch {}
    }

    const bodyComp = parsedComponents.find((c) => c && c.type === 'BODY');
    const headerComp = parsedComponents.find((c) => c && c.type === 'HEADER');

    const expectedBodyVarsCount = bodyComp?.text
      ? (bodyComp.text.match(/{{\d+}}/g) || []).length
      : undefined;
    const expectedHeaderVarsCount =
      headerComp?.format === 'TEXT' && headerComp.text
        ? (headerComp.text.match(/{{\d+}}/g) || []).length
        : undefined;

    // Header media or text parameters
    if (headerComp?.format === 'IMAGE' || (!headerComp && params.headerMediaUrl)) {
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
      }
    } else if (
      (expectedHeaderVarsCount === undefined && params.headerVariables && params.headerVariables.length > 0) ||
      (expectedHeaderVarsCount !== undefined && expectedHeaderVarsCount > 0)
    ) {
      const vars = params.headerVariables || [];
      const count = expectedHeaderVarsCount !== undefined ? expectedHeaderVarsCount : vars.length;
      if (count > 0) {
        const headerParams = [];
        for (let i = 0; i < count; i++) {
          headerParams.push({ type: 'text', text: String(vars[i] || '-') });
        }
        componentsPayload.push({
          type: 'header',
          parameters: headerParams,
        });
      }
    }

    // Body parameters
    if (
      (expectedBodyVarsCount === undefined && params.bodyVariables && params.bodyVariables.length > 0) ||
      (expectedBodyVarsCount !== undefined && expectedBodyVarsCount > 0)
    ) {
      const vars = params.bodyVariables || [];
      const count = expectedBodyVarsCount !== undefined ? expectedBodyVarsCount : vars.length;
      if (count > 0) {
        const bodyParams = [];
        for (let i = 0; i < count; i++) {
          bodyParams.push({ type: 'text', text: String(vars[i] || '-') });
        }
        componentsPayload.push({
          type: 'body',
          parameters: bodyParams,
        });
      }
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

    const response = await metaFetch(`${META_GRAPH_URL}/${this.phoneNumberId}/messages`, {
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
  async sendTextMessage(
    toOrParams: string | { to: string; text: string },
    optionalText?: string
  ): Promise<MetaSendResponse> {
    const to = typeof toOrParams === 'string' ? toOrParams : toOrParams.to;
    const text = typeof toOrParams === 'string' ? (optionalText || '') : toOrParams.text;
    const cleanPhone = to.replace(/[^0-9]/g, '');

    if (this.isMockMode) {
      const fakeWamid = `wamid.HBgL${Date.now()}X${Math.random().toString(36).substring(2, 9).toUpperCase()}A`;
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: to, wa_id: cleanPhone }],
        messages: [{ id: fakeWamid, message_status: 'accepted' }],
      };
    }
    this.assertRealConnection('send a text message');

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

    const response = await metaFetch(`${META_GRAPH_URL}/${this.phoneNumberId}/messages`, {
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

  /**
   * Send 2-Way Freeform Media message (Image, Video, Audio, Document)
   */
  async sendMediaMessage(params: SendMediaMessageParams): Promise<MetaSendResponse> {
    const cleanPhone = params.to.replace(/[^0-9]/g, '');

    if (this.isMockMode) {
      const fakeWamid = `wamid.HBgL${Date.now()}M${Math.random().toString(36).substring(2, 9).toUpperCase()}A`;
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: params.to, wa_id: cleanPhone }],
        messages: [{ id: fakeWamid, message_status: 'accepted' }],
      };
    }
    this.assertRealConnection('send a media message');

    const mediaObject: Record<string, any> = {};
    if (params.mediaId) {
      mediaObject.id = params.mediaId;
    } else if (params.mediaUrl) {
      mediaObject.link = params.mediaUrl;
    }

    if (params.caption && (params.type === 'image' || params.type === 'video' || params.type === 'document')) {
      mediaObject.caption = params.caption;
    }

    if (params.filename && params.type === 'document') {
      mediaObject.filename = params.filename;
    }

    const payload: Record<string, any> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: params.type,
      [params.type]: mediaObject,
    };

    const response = await metaFetch(`${META_GRAPH_URL}/${this.phoneNumberId}/messages`, {
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

  /**
   * Send WhatsApp Interactive List Message (Meta Graph API v21.0)
   */
  async sendListMessage(params: SendListMessageParams): Promise<MetaSendResponse> {
    const cleanPhone = params.to.replace(/[^0-9]/g, '');

    if (this.isMockMode) {
      const fakeWamid = `wamid.HBgL${Date.now()}L${Math.random().toString(36).substring(2, 9).toUpperCase()}A`;
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: params.to, wa_id: cleanPhone }],
        messages: [{ id: fakeWamid, message_status: 'accepted' }],
      };
    }
    this.assertRealConnection('send a list message');

    const interactivePayload: Record<string, any> = {
      type: 'list',
      body: {
        text: params.body,
      },
      action: {
        button: (params.buttonText || 'View Options').substring(0, 20),
        sections: params.sections.map((section) => ({
          title: section.title ? section.title.substring(0, 24) : undefined,
          rows: section.rows.map((row) => ({
            id: row.id.substring(0, 200),
            title: row.title.substring(0, 24),
            description: row.description ? row.description.substring(0, 72) : undefined,
          })),
        })),
      },
    };

    if (params.header && params.header.trim()) {
      interactivePayload.header = {
        type: 'text',
        text: params.header.trim().substring(0, 60),
      };
    }

    if (params.footer && params.footer.trim()) {
      interactivePayload.footer = {
        text: params.footer.trim().substring(0, 60),
      };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'interactive',
      interactive: interactivePayload,
    };

    const response = await metaFetch(`${META_GRAPH_URL}/${this.phoneNumberId}/messages`, {
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

  /**
   * Send WhatsApp Interactive Reply Buttons (Up to 3 buttons) (Meta Graph API v21.0)
   */
  async sendReplyButtons(params: SendButtonMessageParams): Promise<MetaSendResponse> {
    const cleanPhone = params.to.replace(/[^0-9]/g, '');

    if (this.isMockMode) {
      const fakeWamid = `wamid.HBgL${Date.now()}B${Math.random().toString(36).substring(2, 9).toUpperCase()}A`;
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: params.to, wa_id: cleanPhone }],
        messages: [{ id: fakeWamid, message_status: 'accepted' }],
      };
    }
    this.assertRealConnection('send reply buttons');

    const formattedButtons = params.buttons.slice(0, 3).map((btn) => ({
      type: 'reply',
      reply: {
        id: btn.id.substring(0, 256),
        title: btn.title.substring(0, 20),
      },
    }));

    const interactivePayload: Record<string, any> = {
      type: 'button',
      body: {
        text: params.body,
      },
      action: {
        buttons: formattedButtons,
      },
    };

    if (params.header && params.header.trim()) {
      interactivePayload.header = {
        type: 'text',
        text: params.header.trim().substring(0, 60),
      };
    }

    if (params.footer && params.footer.trim()) {
      interactivePayload.footer = {
        text: params.footer.trim().substring(0, 60),
      };
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'interactive',
      interactive: interactivePayload,
    };

    const response = await metaFetch(`${META_GRAPH_URL}/${this.phoneNumberId}/messages`, {
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

  /**
   * Fetch metadata for a media attachment (including download URL) from Meta Graph API
   */
  async fetchMediaMetadata(
    mediaId: string
  ): Promise<{ url: string; mime_type: string; file_size: number } | null> {
    if (!this.accessToken || !mediaId) return null;

    try {
      const response = await metaFetch(`${META_GRAPH_URL}/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return {
        url: data.url,
        mime_type: data.mime_type,
        file_size: data.file_size,
      };
    } catch {
      return null;
    }
  }

  /**
   * Download binary media stream from Meta CDN with Authorization header
   */
  async downloadMediaStream(
    mediaUrl: string
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!this.accessToken || !mediaUrl) return null;

    try {
      const response = await metaFetch(mediaUrl, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      return {
        buffer: Buffer.from(arrayBuffer),
        contentType,
      };
    } catch {
      return null;
    }
  }
}
