# WAYAPP — User Flows

> End-to-end flows through the product. Each flow lists the triggering UI/API surface, the server/worker paths, and the DB writes.

## 1. Authentication & Access

### 1.1 Login (password)
```
Browser → POST /api/auth/login { email, password }
  → validate email/password (bcrypt) + AuthConfig.allowedDomains/allowedEmails gate
  → create Session row (jti) → sign JWT (HS256, jose) → httpOnly cookie `wayapp_session`
  → redirect to dashboard
Middleware (edge): verifies JWT statelessly; redirects to /login when invalid.
Every API route: requireAuth()/requireRole() → DB session check (revoked/inactive) → user payload.
```

### 1.2 Registration / Invite
```
POST /api/auth/register → first user bootstraps SUPER_ADMIN (allowRegistration + AuthConfig);
otherwise ADMIN-created invite links. No auto-login, no passwordless bypass.
```

### 1.3 API Key (v1 / integrations)
```
Settings > API Keys → generate way_live_<hex> (shown once) → SHA-256 hash stored.
Client → X-API-Key header → authenticateApiRequest() → scopes check → rate limit per key.
```

### 1.4 Meta OAuth
```
GET /api/auth/meta → state (signed cookie) → Facebook dialog → /api/auth/meta/callback
  → exchange code, fetch profile; reject email-less profiles → upsert User → session cookie.
```

## 2. WhatsApp Connection Onboarding

```
Settings > API & Settings
  → Test Connection (GET /v21.0/<wabaId> + phone numbers) → Register Phone (PIN)
  → Activate Connection → encrypt token/appSecret (AES-256-GCM) → save Settings row
  → isConnected = true
Webhook: Meta → GET /api/webhooks/whatsapp (handshake, timing-safe verify token)
          POST /api/webhooks/whatsapp (HMAC-SHA256 x-hub-signature-256, fail-closed, IP rate-limited)
```

## 3. Campaigns & Broadcasting

### 3.1 Create → Dispatch
```
Templates → CampaignWizard → POST /api/campaigns (DRAFT)
  → audience filter JSON + variableMappings (header/body {{N}})
  → POST /api/campaigns/calculate-audience (preview count + sample) → dispatch
  → POST /api/campaigns/[id]/dispatch → atomic DRAFT/QUEUED/PAUSED/SCHEDULED → RUNNING
Worker: dispatchCampaign() (exclusive lock, RUNNING excluded)
  → getTargetContacts() (filter/suppression/segments)
  → createMany skipDuplicates (UNIQUE campaignId+contactId) → per-contact SENDING → Meta send → SENT
  → wamid persisted immediately; counters guarded by transition rank
Sweeper (60s): stuck RUNNING >5min → resume PENDING; all-failed → FAILED; else COMPLETED.
Reconciler (5min): recount aggregated counters from CampaignMessage rows.
```

### 3.2 Inbound reply / status webhook
```
Meta status webhook → CampaignMessage status transition (PENDING<SENT<DELIVERED<READ<REPLIED, FAILED terminal)
  → campaign counter increments; Meta 130472 → auto-suppress Contact (UNSUBSCRIBED).
Inbound message → contact upsert (E.164 normalized) → conversation upsert → chatMessage upsert (wamid)
  → REPLIED attribution (within 24h of SENT/DELIVERED/READ) → automation/flow/bot worker event.
```

## 4. Inbox & Conversations

```
Inbox poll (3.5s) → GET /api/chat → conversation list { contact, messages[last], unreadCount }.
Open thread → GET /api/chat?contactId → thread messages → unread reset.
Reply → POST /api/chat { text/template/media } → 24h window guard for free-text → send → ChatMessage OUTBOUND.
Assign: POST /api/chat/round-robin (ADMIN) or manual assign → ConversationEvent audit trail.
Notes: POST /api/chat/conversations/[id]/notes (internal only, never sent to customer).
Push: NotificationProvider polls inbound → chime + toast + Notification API (hidden tab).
```

## 5. Automation & Bots

```
Webhook inbound → worker inbound-events → processInboundAutomation (trigger match)
  → AutomationAction (SEND_TEXT/SEND_TEMPLATE/ADD_TAG/ASSIGN_GROUP) → decrypt token → send → AutomationLog.
Bots: keyword/AI/HTTP — cooldown + daily cap + depth limit; bot-sent messages never re-trigger bots.
Knowledge Base → chunks → AI prompt context for bot answers.
```

## 6. Templates

```
Templates page → GET /api/templates (DB) → Sync → GET /api/templates/sync → client.fetchTemplates()
  (WABA pagination via paging.next, requires wabaId) → upsert + status sync via webhook.
Create → POST /api/templates → local draft → Meta create (components validation) → status PENDING.
Test → POST /api/templates/test → sends a real message (ADMIN role).
```

## 7. Media

```
Upload: POST /api/media/upload (auth + rate limit) → strict MIME allow-list
  (image/video/audio/pdf/plain; HTML/SVG/XML rejected) → extension from server map → public/uploads.
Stream: GET /api/media/[id] (auth + rate limit) → Meta metadata → CDN download →
  MIME whitelist + nosniff + private no-store + inline/attachment disposition.
```

## 8. Public API (v1)

```
POST /api/v1/auth/token  (email+password → JWT)   [rate-limited per IP]
GET  /api/v1/docs        (Swagger UI)
Contacts / Messages / Templates / Campaigns / Conversations / Agents / Flows / Analytics
  → X-API-Key or Bearer → scope check → zod validation → same business logic as dashboard.
```

## 9. PWA & Push

```
Browser: /sw.js (service worker) → push subscribe → POST /api/push/subscribe (session required)
Worker: outbound-webhooks loop (5s) → WebhookDelivery retry queue → HMAC X-WAYAPP-Signature.
```