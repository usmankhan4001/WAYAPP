export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'LOCATION';
  text?: string;
  example?: {
    header_text?: string[];
    header_handle?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
}

export interface MetaTemplateResponse {
  name: string;
  components: MetaTemplateComponent[];
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  id: string;
}

export interface SendTemplateMessageParams {
  to: string; // E.164 without '+' or with '+'
  templateName: string;
  languageCode: string;
  headerMediaUrl?: string;
  headerVariables?: string[];
  bodyVariables?: string[];
  buttonPayloads?: Array<{ type: string; payload: string }>;
}

export interface MetaSendResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string; // wamid.HBg...
    message_status?: string;
  }>;
}

export interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: 'text' | 'image' | 'document' | 'button' | 'interactive';
          text?: {
            body: string;
          };
          button?: {
            text: string;
            payload: string;
          };
          interactive?: {
            button_reply?: {
              id: string;
              title: string;
            };
            list_reply?: {
              id: string;
              title: string;
            };
          };
        }>;
        statuses?: Array<{
          id: string; // wamid
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message: string;
            error_data?: {
              details: string;
            };
          }>;
        }>;
      };
      field: string;
    }>;
  }>;
}
