import { WEBHOOK_EVENT_NAMES } from '@/lib/webhook-events';

/**
 * OpenAPI 3 description of every /api/v1 route. Served at /api/v1/openapi.json and rendered
 * at /api/v1/docs. Keep this in step with the routes: tests/openapi.test.ts fails if a
 * route file under src/app/api/v1 has no matching path here.
 */

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: unknown) => ({ 'application/json': { schema } });
const idParam = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});
const cursorParams = [
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
  { name: 'cursor', in: 'query', description: 'The nextCursor value from the previous page.', schema: { type: 'string' } },
];
const errors = (...codes: number[]) =>
  Object.fromEntries(
    codes.map((c) => [
      String(c),
      { description: { 400: 'Invalid request', 401: 'Missing or invalid API key', 403: 'Key lacks the required scope', 404: 'Not found', 409: 'Conflict', 429: 'Too many requests', 500: 'Server error' }[c] || 'Error', content: json(ref('Error')) },
    ])
  );
const secured = [{ ApiKeyAuth: [] }, { BearerAuth: [] }];
const page = (item: string) => ({
  type: 'object',
  properties: {
    data: { type: 'array', items: ref(item) },
    pagination: { type: 'object', properties: { nextCursor: { type: ['string', 'null'] }, limit: { type: 'integer' } } },
  },
});
const ok = { type: 'object', properties: { success: { type: 'boolean' } } };

export function buildOpenApiDocument(serverUrl = '/') {
  return {
    openapi: '3.1.0',
    info: {
      title: 'WayApp API',
      version: '1.0.0',
      description:
        'Send WhatsApp messages, manage contacts and read conversations. Authenticate with an API key in the `X-API-Key` header. Every error looks like `{ "error": "...", "code": "..." }`. Events we send to your webhook endpoints use the WebhookEnvelope schema.',
    },
    servers: [{ url: serverUrl }],
    security: secured,
    tags: [
      { name: 'Messages' }, { name: 'Contacts' }, { name: 'Conversations' }, { name: 'Campaigns' },
      { name: 'Reference data' }, { name: 'Auth' },
    ],
    paths: {
      '/api/v1/messages': {
        post: {
          tags: ['Messages'], summary: 'Send a WhatsApp message', description: 'Scope: messages:send. Free text only inside the 24-hour window; otherwise use a template.',
          requestBody: { required: true, content: json(ref('MessageSend')) },
          responses: { 200: { description: 'Sent', content: json({ type: 'object', properties: { success: { type: 'boolean' }, messageId: { type: 'string' }, wamid: { type: ['string', 'null'] }, status: { type: 'string' }, recipient: { type: 'string' } } }) }, ...errors(400, 401, 403, 429) },
        },
      },
      '/api/v1/messages/log': {
        post: {
          tags: ['Messages'], summary: 'Record a message that was sent elsewhere', description: 'Scope: messages:send. Sends nothing; writes the record so it shows in the inbox. Idempotent on wamid.',
          requestBody: { required: true, content: json(ref('MessageLog')) },
          responses: { 200: { description: 'Recorded', content: json({ type: 'object', properties: { success: { type: 'boolean' }, messageId: { type: 'string' }, duplicate: { type: 'boolean' } } }) }, ...errors(400, 401, 403, 429) },
        },
      },
      '/api/v1/contacts': {
        get: {
          tags: ['Contacts'], summary: 'List contacts', description: 'Scope: contacts:read.',
          parameters: [...cursorParams, { name: 'search', in: 'query', description: 'Matches phone, name or email.', schema: { type: 'string' } }],
          responses: { 200: { description: 'A page of contacts', content: json(page('Contact')) }, ...errors(401, 403, 500) },
        },
        post: {
          tags: ['Contacts'], summary: 'Create a contact (or update it if the phone number exists)', description: 'Scope: contacts:write. Emits contact.created or contact.updated.',
          requestBody: { required: true, content: json(ref('ContactCreate')) },
          responses: { 200: { description: 'Existing contact updated', content: json({ type: 'object', properties: { success: { type: 'boolean' }, contact: ref('Contact') } }) }, 201: { description: 'Contact created', content: json({ type: 'object', properties: { success: { type: 'boolean' }, contact: ref('Contact') } }) }, ...errors(400, 401, 403, 500) },
        },
      },
      '/api/v1/contacts/{id}': {
        parameters: [idParam('id', 'Contact id')],
        get: { tags: ['Contacts'], summary: 'Get a contact', description: 'Scope: contacts:read.', responses: { 200: { description: 'The contact', content: json(ref('Contact')) }, ...errors(401, 403, 404) } },
        put: { tags: ['Contacts'], summary: 'Update a contact', description: 'Scope: contacts:write. Emits contact.updated.', requestBody: { required: true, content: json(ref('ContactUpdate')) }, responses: { 200: { description: 'Updated', content: json({ type: 'object', properties: { success: { type: 'boolean' }, contact: ref('Contact') } }) }, ...errors(400, 401, 403, 404) } },
        patch: { tags: ['Contacts'], summary: 'Update a contact (same as PUT)', description: 'Scope: contacts:write.', requestBody: { required: true, content: json(ref('ContactUpdate')) }, responses: { 200: { description: 'Updated', content: json({ type: 'object', properties: { success: { type: 'boolean' }, contact: ref('Contact') } }) }, ...errors(400, 401, 403, 404) } },
        delete: { tags: ['Contacts'], summary: 'Delete a contact', description: 'Scope: contacts:write.', responses: { 200: { description: 'Deleted', content: json(ok) }, ...errors(401, 403, 404) } },
      },
      '/api/v1/contacts/{id}/tags': {
        parameters: [idParam('id', 'Contact id')],
        post: { tags: ['Contacts'], summary: 'Add tags to a contact', description: 'Scope: contacts:write. Tags are created if they do not exist.', requestBody: { required: true, content: json({ type: 'object', required: ['tags'], properties: { tags: { type: 'array', items: { type: 'string' } } } }) }, responses: { 200: { description: 'Added', content: json(ok) }, ...errors(400, 401, 403, 404) } },
      },
      '/api/v1/contacts/{id}/tags/{tag}': {
        parameters: [idParam('id', 'Contact id'), idParam('tag', 'Tag id or exact tag name (URL-encoded)')],
        delete: { tags: ['Contacts'], summary: 'Remove a tag from a contact', description: 'Scope: contacts:write.', responses: { 200: { description: 'Removed', content: json(ok) }, ...errors(401, 403, 404) } },
      },
      '/api/v1/contacts/{id}/groups': {
        parameters: [idParam('id', 'Contact id')],
        post: { tags: ['Contacts'], summary: 'Add a contact to groups', description: 'Scope: contacts:write.', requestBody: { required: true, content: json({ type: 'object', required: ['groupIds'], properties: { groupIds: { type: 'array', items: { type: 'string' } } } }) }, responses: { 200: { description: 'Added', content: json(ok) }, ...errors(400, 401, 403, 404) } },
      },
      '/api/v1/contacts/{id}/groups/{group}': {
        parameters: [idParam('id', 'Contact id'), idParam('group', 'Group id')],
        delete: { tags: ['Contacts'], summary: 'Remove a contact from a group', description: 'Scope: contacts:write.', responses: { 200: { description: 'Removed', content: json(ok) }, ...errors(401, 403, 404) } },
      },
      '/api/v1/conversations': {
        get: {
          tags: ['Conversations'], summary: 'List conversations (latest 50)', description: 'Scope: conversations:read.',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'PENDING', 'RESOLVED', 'SPAM'] } },
            { name: 'assignedToId', in: 'query', description: 'An agent id, or "none" for unassigned.', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Conversations', content: json({ type: 'array', items: ref('Conversation') }) }, ...errors(401, 403, 500) },
        },
      },
      '/api/v1/conversations/{id}': {
        parameters: [idParam('id', 'Conversation id')],
        patch: {
          tags: ['Conversations'], summary: 'Assign a conversation or change its status', description: 'Scope: conversations:write. Emits conversation.assigned.',
          requestBody: { required: true, content: json({ type: 'object', properties: { assignedToId: { type: ['string', 'null'] }, status: { type: 'string', enum: ['OPEN', 'PENDING', 'RESOLVED', 'SPAM'] } } }) },
          responses: { 200: { description: 'Updated', content: json({ type: 'object', properties: { success: { type: 'boolean' }, conversation: ref('Conversation') } }) }, ...errors(400, 401, 403, 404) },
        },
      },
      '/api/v1/conversations/{id}/messages': {
        parameters: [idParam('id', 'Conversation id')],
        get: { tags: ['Conversations'], summary: 'List the messages of a conversation, newest first', description: 'Scope: conversations:read.', parameters: cursorParams, responses: { 200: { description: 'A page of messages', content: json(page('ChatMessage')) }, ...errors(401, 403, 404) } },
      },
      '/api/v1/campaigns': {
        get: { tags: ['Campaigns'], summary: 'List campaigns', description: 'Scope: campaigns:read.', responses: { 200: { description: 'Campaigns', content: json({ type: 'array', items: { type: 'object', additionalProperties: true } }) }, ...errors(401, 403, 500) } },
        post: { tags: ['Campaigns'], summary: 'Create a campaign', description: 'Scope: campaigns:write.', requestBody: { required: true, content: json({ type: 'object', required: ['name', 'templateId'], properties: { name: { type: 'string' }, templateId: { type: 'string' }, audienceFilter: { type: 'object', additionalProperties: true }, variableMappings: { type: 'object', additionalProperties: { type: 'string' } }, headerMediaUrl: { type: 'string', format: 'uri' }, scheduledAt: { type: 'string', format: 'date-time' }, startImmediately: { type: 'boolean', default: false } } }) }, responses: { 201: { description: 'Created', content: json({ type: 'object', properties: { success: { type: 'boolean' }, campaign: { type: 'object', additionalProperties: true } } }) }, ...errors(400, 401, 403, 404, 500) } },
      },
      '/api/v1/campaigns/{id}': {
        parameters: [idParam('id', 'Campaign id')],
        get: { tags: ['Campaigns'], summary: 'Get a campaign with its stats', description: 'Scope: campaigns:read.', responses: { 200: { description: 'The campaign', content: json({ type: 'object', additionalProperties: true }) }, ...errors(401, 403, 404) } },
      },
      '/api/v1/templates': {
        get: { tags: ['Reference data'], summary: 'List message templates', description: 'Scope: templates:read.', responses: { 200: { description: 'Templates', content: json({ type: 'array', items: { type: 'object', additionalProperties: true } }) }, ...errors(401, 403, 500) } },
      },
      '/api/v1/flows': {
        get: { tags: ['Reference data'], summary: 'List flows', description: 'Scope: flows:read.', responses: { 200: { description: 'Flows', content: json({ type: 'array', items: { type: 'object', additionalProperties: true } }) }, ...errors(401, 403, 500) } },
      },
      '/api/v1/agents': {
        get: { tags: ['Reference data'], summary: 'List active agents', description: 'Scope: agents:read.', responses: { 200: { description: 'Agents', content: json({ type: 'array', items: { type: 'object', additionalProperties: true } }) }, ...errors(401, 403, 500) } },
      },
      '/api/v1/analytics': {
        get: { tags: ['Reference data'], summary: 'Message and conversation analytics', description: 'Scope: analytics:read.', responses: { 200: { description: 'Analytics', content: json({ type: 'object', additionalProperties: true }) }, ...errors(401, 403, 500) } },
      },
      '/api/v1/auth/token': {
        post: {
          tags: ['Auth'], summary: 'Exchange email and password for a Bearer token (30 days)', security: [],
          requestBody: { required: true, content: json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }) },
          responses: { 200: { description: 'Token', content: json({ type: 'object', properties: { access_token: { type: 'string' }, token_type: { type: 'string' }, expires_in: { type: 'integer' }, user: { type: 'object', additionalProperties: true } } }) }, ...errors(400, 401, 429, 500) },
        },
      },
      '/api/v1/openapi.json': {
        get: { tags: ['Reference data'], summary: 'This document', security: [], responses: { 200: { description: 'OpenAPI 3 document', content: json({ type: 'object' }) } } },
      },
      '/api/v1/docs': {
        get: { tags: ['Reference data'], summary: 'Interactive documentation page (HTML)', security: [], responses: { 200: { description: 'HTML page', content: { 'text/html': { schema: { type: 'string' } } } } } },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'Create a key in Settings, Developer. Keys start with way_live_.' },
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'From POST /api/v1/auth/token. Has full access.' },
      },
      schemas: {
        Error: { type: 'object', required: ['error', 'code'], properties: { error: { type: 'string' }, code: { type: 'string', enum: ['unauthorized', 'forbidden', 'invalid_request', 'not_found', 'rate_limited', 'conflict', 'policy_violation', 'send_failed', 'internal_error'] } } },
        MessageSend: { type: 'object', required: ['to'], properties: { to: { type: 'string', description: 'Phone number, E.164' }, type: { type: 'string', enum: ['text', 'template', 'image', 'video', 'document', 'audio'], default: 'text' }, text: { type: 'string' }, templateName: { type: 'string' }, languageCode: { type: 'string', default: 'en_US' }, bodyVariables: { type: 'array', items: { type: 'string' } }, mediaUrl: { type: 'string', format: 'uri' }, caption: { type: 'string' }, filename: { type: 'string' } } },
        MessageLog: { type: 'object', required: ['to', 'wamid'], properties: { to: { type: 'string' }, wamid: { type: 'string' }, type: { type: 'string', enum: ['text', 'template', 'image', 'video', 'document', 'audio'], default: 'text' }, text: { type: 'string', maxLength: 4096 }, templateName: { type: 'string' }, bodyVariables: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['SENT', 'DELIVERED'], default: 'SENT' }, sentAt: { type: 'string', format: 'date-time' } } },
        ContactCreate: { type: 'object', required: ['phoneNumber'], properties: { phoneNumber: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string', format: 'email' }, customAttributes: { type: 'object', additionalProperties: true }, tags: { type: 'array', items: { type: 'string' } }, groupIds: { type: 'array', items: { type: 'string' } } } },
        ContactUpdate: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string', format: 'email' }, customAttributes: { type: 'object', additionalProperties: true }, status: { type: 'string', enum: ['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'BLOCKED'] } } },
        Contact: { type: 'object', properties: { id: { type: 'string' }, phoneNumber: { type: 'string' }, firstName: { type: ['string', 'null'] }, lastName: { type: ['string', 'null'] }, email: { type: ['string', 'null'] }, status: { type: 'string' }, customAttributes: { type: ['string', 'null'], description: 'JSON string' }, createdAt: { type: 'string', format: 'date-time' }, tags: { type: 'array', items: { type: 'object', additionalProperties: true } }, groups: { type: 'array', items: { type: 'object', additionalProperties: true } } } },
        Conversation: { type: 'object', properties: { id: { type: 'string' }, contactId: { type: 'string' }, assignedToId: { type: ['string', 'null'] }, status: { type: 'string' }, lastMessageAt: { type: 'string', format: 'date-time' }, unreadCount: { type: 'integer' } } },
        ChatMessage: { type: 'object', properties: { id: { type: 'string' }, conversationId: { type: ['string', 'null'] }, contactId: { type: 'string' }, direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] }, messageType: { type: 'string' }, body: { type: ['string', 'null'] }, mediaUrl: { type: ['string', 'null'] }, wamid: { type: ['string', 'null'] }, status: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } },
        WebhookEnvelope: { type: 'object', description: 'What we POST to your endpoint. Headers: X-WAYAPP-Signature (hex HMAC-SHA256 of "<timestamp>.<body>" with your signing secret), X-WAYAPP-Timestamp, X-WAYAPP-Event.', properties: { event: { type: 'string', enum: WEBHOOK_EVENT_NAMES }, timestamp: { type: 'string', format: 'date-time' }, data: { type: 'object', additionalProperties: true } } },
      },
    },
  };
}
