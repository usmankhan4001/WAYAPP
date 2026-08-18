export type MetaErrorCategory =
  | 'RETRYABLE'
  | 'CREDENTIALS_INVALID'
  | 'PAYMENT_REQUIRED'
  | 'RATE_LIMITED'
  | 'TEMPLATE_ISSUE'
  | 'UNDELIVERABLE'
  | 'POLICY_VIOLATION'
  | 'SANDBOX_RESTRICTION'
  | 'UNREGISTERED_PHONE'
  | 'GENERIC';

export interface MetaErrorInfo {
  code: number | string;
  category: MetaErrorCategory;
  title: string;
  userMessage: string;
  action: string;
  isRetryable: boolean;
}

const META_ERROR_CATALOG: Record<number, Omit<MetaErrorInfo, 'code'>> = {
  // Token & Auth Errors
  190: {
    category: 'CREDENTIALS_INVALID',
    title: 'Access Token Expired or Invalid',
    userMessage: 'The Meta System User Access Token has expired, been revoked, or is invalid.',
    action: 'Generate a Permanent System User Access Token in Meta Business Manager and update API & Settings.',
    isRetryable: false,
  },
  100: {
    category: 'CREDENTIALS_INVALID',
    title: 'Invalid Parameter or Node ID',
    userMessage: 'The requested Graph API object does not exist or parameters are mismatched.',
    action: 'Verify that your WABA ID and Phone Number ID are not swapped in API & Settings.',
    isRetryable: false,
  },
  200: {
    category: 'CREDENTIALS_INVALID',
    title: 'Permission Denied',
    userMessage: 'Your token is missing required WhatsApp permissions.',
    action: 'Ensure your System User token has whatsapp_business_messaging and whatsapp_business_management permissions enabled.',
    isRetryable: false,
  },

  // Sandbox & Test Limits
  131030: {
    category: 'SANDBOX_RESTRICTION',
    title: 'Recipient Not in Test Whitelist',
    userMessage: 'Meta Developer Test Numbers can only send messages to verified recipient numbers.',
    action: 'Add this recipient phone number to the "To" list in Meta for Developers > WhatsApp > API Setup, or attach a real phone number for production.',
    isRetryable: false,
  },

  // 24h Conversation Window
  131047: {
    category: 'POLICY_VIOLATION',
    title: '24-Hour Conversation Window Expired',
    userMessage: 'More than 24 hours have passed since the customer last messaged this WhatsApp number.',
    action: 'Send a pre-approved WhatsApp Message Template to re-open the conversation window with this customer.',
    isRetryable: false,
  },

  // Billing & Payment
  131042: {
    category: 'PAYMENT_REQUIRED',
    title: 'Business Account Payment Issue',
    userMessage: 'Your WhatsApp Business Account requires a payment method to send additional messages.',
    action: 'Add a valid payment method (credit card) to your WhatsApp Business Account in Meta Business Manager.',
    isRetryable: false,
  },

  // Contact & Delivery
  131026: {
    category: 'UNDELIVERABLE',
    title: 'Message Undeliverable',
    userMessage: 'This phone number is not registered on WhatsApp or is currently inactive.',
    action: 'Verify the customer phone number and country code.',
    isRetryable: false,
  },
  131009: {
    category: 'UNDELIVERABLE',
    title: 'Invalid Phone Number Format',
    userMessage: 'The recipient phone number is not formatted as a valid E.164 number.',
    action: 'Ensure the phone number includes the international country code without spaces or special characters.',
    isRetryable: false,
  },
  130472: {
    category: 'POLICY_VIOLATION',
    title: 'Customer Opted Out / Blocked',
    userMessage: 'The recipient has blocked or opted out of messages from this business.',
    action: 'Respect customer privacy and remove this contact from marketing broadcasts.',
    isRetryable: false,
  },

  // Template Errors
  132000: {
    category: 'TEMPLATE_ISSUE',
    title: 'Template Parameter Mismatch',
    userMessage: 'The number of variables sent does not match the parameters expected by the template.',
    action: 'Check your variable mappings in the campaign wizard.',
    isRetryable: false,
  },
  132001: {
    category: 'TEMPLATE_ISSUE',
    title: 'Template Does Not Exist',
    userMessage: 'The specified template name or language code is not found on Meta.',
    action: 'Click "Sync from Meta" on the Templates page to ensure all templates are synchronized.',
    isRetryable: false,
  },
  132005: {
    category: 'TEMPLATE_ISSUE',
    title: 'Template Text Too Long',
    userMessage: 'The message body exceeds the 1024 character limit set by Meta.',
    action: 'Shorten your template body text in the Template Builder.',
    isRetryable: false,
  },
  132007: {
    category: 'TEMPLATE_ISSUE',
    title: 'Template Title Too Long',
    userMessage: 'The template header text exceeds the 60 character limit.',
    action: 'Shorten the header text.',
    isRetryable: false,
  },
  132015: {
    category: 'TEMPLATE_ISSUE',
    title: 'Template Paused Due to Low Quality',
    userMessage: 'Meta has paused this template because too many recipients reported it as spam.',
    action: 'Create a new template with higher relevance or wait for Meta review.',
    isRetryable: false,
  },

  // Phone Number Registration & Display Name
  131037: {
    category: 'UNREGISTERED_PHONE',
    title: 'Phone Display Name Pending Approval',
    userMessage: 'The display name for your WhatsApp Business phone number has not yet been approved by Meta.',
    action: 'Open Meta Business Manager > WhatsApp Accounts > Phone Numbers, verify your Display Name status is APPROVED, or submit a business display name for review.',
    isRetryable: false,
  },
  131045: {
    category: 'UNREGISTERED_PHONE',
    title: 'Phone Number Not Registered on Cloud API',
    userMessage: 'This business phone number has not completed 2FA PIN registration on Meta Cloud API.',
    action: 'Go to API & Settings and complete the 1-click Phone Number Registration.',
    isRetryable: false,
  },
  131056: {
    category: 'UNREGISTERED_PHONE',
    title: 'Phone Number Pairing Error',
    userMessage: 'This phone number is still registered on the standard WhatsApp or WhatsApp Business mobile app.',
    action: 'Delete or deregister your WhatsApp account on your mobile app before registering it with the Cloud API.',
    isRetryable: false,
  },

  // Rate Limits & Transient Overloads
  130429: {
    category: 'RATE_LIMITED',
    title: 'Throughput Rate Limit Exceeded',
    userMessage: 'You have reached your tier messaging throughput limit (requests per second).',
    action: 'The queue will automatically retry this message using exponential backoff.',
    isRetryable: true,
  },
  133004: {
    category: 'RETRYABLE',
    title: 'Meta Server Overloaded',
    userMessage: 'Meta Cloud API servers are temporarily experiencing high load.',
    action: 'The queue will automatically retry this message in a few seconds.',
    isRetryable: true,
  },
  131016: {
    category: 'RETRYABLE',
    title: 'Meta Service Unavailable',
    userMessage: 'Meta WhatsApp Cloud API gateway is temporarily unavailable.',
    action: 'The queue will automatically retry this message with backoff.',
    isRetryable: true,
  },
};

/**
 * Classifies any error code or error message from Meta into actionable diagnostics
 */
export function interpretMetaError(errorCode: number | string | undefined, rawMessage?: string): MetaErrorInfo {
  const numCode = typeof errorCode === 'string' ? parseInt(errorCode, 10) : Number(errorCode || 0);

  if (numCode && META_ERROR_CATALOG[numCode]) {
    return {
      code: numCode,
      ...META_ERROR_CATALOG[numCode],
    };
  }

  // Text-based fallback matching
  const msgLower = (rawMessage || '').toLowerCase();

  if (msgLower.includes('token') || msgLower.includes('session') || msgLower.includes('oauth')) {
    return {
      code: errorCode || 190,
      category: 'CREDENTIALS_INVALID',
      title: 'Authentication Error',
      userMessage: 'Access token expired or unauthorized.',
      action: 'Verify your Permanent System User Access Token in API & Settings.',
      isRetryable: false,
    };
  }

  if (msgLower.includes('payment') || msgLower.includes('bill')) {
    return {
      code: errorCode || 131042,
      category: 'PAYMENT_REQUIRED',
      title: 'Payment Method Required',
      userMessage: 'Your WhatsApp Business Account requires an active payment method.',
      action: 'Add a credit card in Meta Business Manager.',
      isRetryable: false,
    };
  }

  if (msgLower.includes('24') || msgLower.includes('re-engagement') || msgLower.includes('window')) {
    return {
      code: errorCode || 131047,
      category: 'POLICY_VIOLATION',
      title: '24h Conversation Window Expired',
      userMessage: 'Freeform text messages cannot be sent outside the 24-hour customer care window.',
      action: 'Send an approved message template instead.',
      isRetryable: false,
    };
  }

  if (msgLower.includes('rate') || msgLower.includes('limit') || msgLower.includes('throughput')) {
    return {
      code: errorCode || 130429,
      category: 'RATE_LIMITED',
      title: 'Rate Limit Hit',
      userMessage: 'Messaging rate limit reached.',
      action: 'System will automatically retry with exponential delay.',
      isRetryable: true,
    };
  }

  return {
    code: errorCode || 'UNKNOWN',
    category: 'GENERIC',
    title: 'Meta Cloud API Error',
    userMessage: rawMessage || 'An unexpected error occurred while communicating with Meta.',
    action: 'Review error details in campaign logs or verify Meta API status.',
    isRetryable: false,
  };
}
