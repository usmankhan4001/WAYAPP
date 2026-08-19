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
  templateComponents?: MetaTemplateComponent[] | string;
  buttonPayloads?: Array<{ type: string; payload: string }>;
}

export interface SendMediaMessageParams {
  to: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
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

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title?: string;
  rows: InteractiveListRow[];
}

export interface SendListMessageParams {
  to: string;
  body: string;
  buttonText: string;
  sections: InteractiveListSection[];
  header?: string;
  footer?: string;
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface SendButtonMessageParams {
  to: string;
  body: string;
  buttons: InteractiveButton[];
  header?: string;
  footer?: string;
}

export interface InboundConversationEvent {
  contactId: string;
  conversationId?: string;
  phoneNumber: string;
  wamid: string;
  messageType: string;
  bodyText: string;
  interactiveId?: string;
  interactiveTitle?: string;
  buttonPayload?: string;
  timestamp?: Date;
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
          type: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'location' | 'button' | 'interactive';
          text?: {
            body: string;
          };
          button?: {
            text: string;
            payload: string;
          };
          interactive?: {
            type?: 'button_reply' | 'list_reply';
            button_reply?: {
              id: string;
              title: string;
            };
            list_reply?: {
              id: string;
              title: string;
              description?: string;
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
