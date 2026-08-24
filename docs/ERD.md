# WAYAPP — Entity Relationship Diagram

> Prisma schema reference: `prisma/schema.prisma` · Database: PostgreSQL · Provider: `prisma-client-js`
> Migrations: `prisma/migrations/` (baseline `20260819000000_baseline`, created offline from empty schema)

## Conventions

- `cuid()` string primary keys unless noted.
- JSON-string columns are validated at the application layer (no Postgres JSONB — kept string for portability).
- Enum-like columns (`status`, `role`, `type`, ...) are plain `String` with application-level whitelists; the `Campaign.status` lifecycle is enforced by the worker state machine.

## Core Configuration & Identity

```
Settings (1 row, id="default")
  wabaId, phoneNumberId, accessToken* (AES-256-GCM), webhookVerifyToken*, appSecret*,
  businessName, businessPhone, defaultCountryCode, rateLimitPerSecond, tierDailyLimit,
  qualityRating, isMockMode, isConnected, marketingMessagesEnabled, marketingMessagesPolicy

AuthConfig (1 row, id="default")
  metaAppId, metaAppSecret*, allowedDomains, allowedEmails, requireAuth, allowRegistration

User 1───* Session            (sessions: jti-based revocation, 24h expiry)
User 1───* ApiKey             (SHA-256 keyHash, scopes, expiry/revoke)
User 1───* ConversationNote   (inbox internal notes)
User 1───* ConversationEvent  (assignment/status audit trail)
User *───o Conversation       (assignedTo)
```

## Contacts & Categorization

```
Contact 1───* ContactsOnGroups *───1 ContactGroup
Contact 1───* ContactsOnTags    *───1 Tag
Contact 1───o Conversation          (one active conversation per contact, contactId UNIQUE)
Contact 1───* CampaignMessage       (broadcast history)
Contact 1───* ChatMessage           (inbox history)
Contact 1───* ContactSuppression    (MARKETING_OPT_OUT / GLOBAL / MANUAL)
Contact 1───* ConversionEvent       (funnel events)
Segment (rulesJson: { match: ALL|ANY, rules: [] })
```

## Messaging & Broadcasting

```
Template 1───* Campaign
Campaign 1───* CampaignMessage *───o Contact
  CampaignMessage: UNIQUE(campaignId, contactId)  ← idempotent dispatch guard
  CampaignMessage.wamid UNIQUE                     ← dedup Meta message IDs
  Lifecycle: PENDING → SENDING → SENT → DELIVERED → READ → REPLIED / FAILED
  Counters (aggregated on Campaign): totalContacts, sentCount, deliveredCount,
                                     readCount, repliedCount, failedCount
```

## 2-Way Multi-Agent Inbox

```
Conversation 1───* ChatMessage *───1 Contact
Conversation 1───* ConversationNote *───1 User (author)
Conversation 1───* ConversationEvent *───o User (actor)
ChatMessage: direction INBOUND|OUTBOUND, wamid UNIQUE, timestamp-indexed
```

## Automation & Bots

```
Automation 1───* AutomationLog
KnowledgeBase 1───* Bot
Bot (kind: KEYWORD|AI|HTTP; aiConfig stores encrypted provider keys)
```

## No-Code Flows

```
Flow 1───* FlowRun *───1 Contact
FlowRun 1───* FlowLog
ConversationFlow (GCC lead-qualification) 1───* ConversationSession *───1 Contact
```

## Public Platform (v1 API + Outbound Webhooks)

```
ApiKey (keyHash UNIQUE, scopes, lastUsedAt, expiresAt, revokedAt)
WebhookEndpoint 1───* WebhookDelivery   (retry queue: 5 attempts, 1m/5m/30m/2h/12h)
PushSubscription (endpoint UNIQUE, expoToken for native app)
```

## Key Indexes

| Model | Index |
|---|---|
| CampaignMessage | `(campaignId)`, `(phoneNumber)`, `(status)`, `(createdAt)`, UNIQUE `(campaignId, contactId)`, UNIQUE `(wamid)` |
| ChatMessage | `(contactId)`, `(conversationId)`, `(wamid)`, `(timestamp)` |
| Contact | `(status)`, `(phoneNumber)` UNIQUE |
| Conversation | `(assignedToId)`, `(status)`, `(lastMessageAt)` |
| Session | `(userId)`, `(expiresAt)` |
| WebhookDelivery | `(endpointId)`, `(status)`, `(nextRetryAt)` |
| FlowRun / ConversationSession | `(flowId)`, `(contactId)`, `(status)` |

## Security Notes

- `Settings.accessToken`, `Settings.appSecret`, `AuthConfig.metaAppSecret` and bot/API-key secrets are encrypted at rest with AES-256-GCM (key from `ENCRYPTION_KEY`/`AUTH_SECRET`, fail-closed in production).
- `ApiKey.keyHash` is a one-way SHA-256; raw keys are shown once at creation.
- `webhookVerifyToken` is generated randomly at first boot (`db-init.ts`) — never hardcoded.
- All passwords are hashed (bcrypt) — plaintext is never stored.