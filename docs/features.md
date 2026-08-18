# Feature Specs (F1–F6)

## F1 — No-Code Flow Builder (drag-and-drop chatbot journeys)

**Models:**
- `Flow { id, name, description, status(DRAFT/PUBLISHED/ARCHIVED), startNodeId, nodesJson, edgesJson, version, createdBy, updatedAt }`
- `FlowRun { id, flowId, contactId, currentNodeId, variables Json, status(ACTIVE/COMPLETED/ERROR), enteredAt, exitedAt }`
- `FlowLog { id, flowRunId, nodeId, action, status, errorMessage, createdAt }`

**Node palette (v1 — core):**
- Trigger: keyword match / ANY_INBOUND / new contact
- Message: text / template / media, with `{{var}}` interpolation
- Quick replies: message + up to 3 buttons → branch on reply
- Condition: contact attribute / variable (equals, contains, number compare)
- Delay: wait minutes/hours → resume via `resumeAt` poller
- Action: ADD_TAG / REMOVE_TAG / ADD_TO_GROUP / UPDATE_CONTACT
- GoTo/Jump + End

**Engine (worker):** inbound → match flow → create `FlowRun` → advance node-by-node through throttled queue; guards: max 50 nodes/run, 10 runs/contact/day, loop protection; run position persisted (crash-resume).

**UI:** `src/app/flows/` + `@xyflow/react` — palette sidebar, drag-drop canvas, inline node editors, edge validation (start node required), live simulator panel, publish/unpublish, JSON version snapshots. Automations gain a "Flow" action type.

## F2 — Keyword & AI Bots

**Model (evolve `Automation`):** `Bot { name, kind(KEYWORD|AI|HTTP), triggerConfig Json, aiConfig Json?, actionsJson Json, isActive, cooldownSeconds, dailyCap, executionCount, lastTriggeredAt }`

**AI providers:** OpenAI · Anthropic · Gemini · OpenRouter · any OpenAI-compatible endpoint — single client interface in `lib/ai/provider.ts`; per-bot API keys (encrypted at rest). OpenRouter uses OpenAI-compatible adapter + model routing.

**Knowledge Base:**
- `KnowledgeBase { id, name, sourceType(GENERATED|UPLOADED), rawNotes Text?, contentMarkdown, chunks Json, status(DRAFT/READY), createdAt, updatedAt }`
- Generator: admin pastes business notes / answers guided form → AI prompt produces structured Markdown KB (FAQ + key facts) → review/edit → READY
- Bots attach a KB: top-k chunk retrieval stuffed into system prompt (cap ~8k tokens, v1 keyword scoring; EMBED mode later via same interface)
- Memory: last 5 `ChatMessage` rows in context

**HTTP bots:** POST inbound message to user-configured URL; response text sent back. "Using API, 24/7".

**Guardrails:** per-(bot, contact) cooldown, per-bot daily cap, execution depth limit, ReDoS-safe regex compilation, bot-sent messages never trigger other bots.

**Execution:** webhook enqueues `BotTriggerEvent` → worker consumes → `AutomationLog` per execution (replaces fire-and-forget inline execution).

## F3 — Bulk Campaigns (complete existing engine)

Ship with M1 (hardening P3). Components:
- Scheduler: `SCHEDULED && scheduledAt <= now` → enqueue; date picker in wizard
- Idempotent dispatch: `@@unique([campaignId, contactId])` + skip-existing
- Atomic state machine + recovery sweeper; DELETE blocked while RUNNING
- Auto-suppression (130472 → UNSUBSCRIBED)
- Counter reconciliation (nightly, from `CampaignMessage` rows)
- Enhancements: campaign clones/drafts, "send-again to non-repliers", audience preview CSV export

## F4 — Multi-Agent Team Inbox

**Models:**
- `Conversation { id, contactId, assignedToId User?, status(OPEN/PENDING/RESOLVED/SPAM), lastMessageAt, unreadCount, createdAt, updatedAt }`
- `ConversationNote { id, conversationId, authorId, body, createdAt }` (internal, never sent)
- `ConversationEvent { id, conversationId, actorId, type(ASSIGNED/UNASSIGNED/STATUS_CHANGED/NOTE_ADDED/TRANSFERRED), payload Json, createdAt }`

**Behavior:** `/api/chat` uses real Conversation rows (auto-created on inbound; backfill migration). Assignment: manual, "Taken by me", optional round-robin (skips away agents), transfer with note. Filters: Mine / Unassigned / All / Resolved. Per-agent unread. Internal notes panel.

**RBAC:** MEMBER chats + self-assigns; ADMIN assigns anyone / resolves / manages routing; VIEWER read-only.

## F5 — Public REST API & Webhooks

**Auth (shared `lib/api/` middleware + rate limits):**
- `Bearer` token via `POST /api/v1/auth/token` (email+password → short-lived JWT + refresh) — for mobile app
- `X-API-Key`: `ApiKey { id, name, keyHash, scopes[], lastUsedAt, expiresAt, revokedAt, createdAt }` — raw key shown once; SHA-256 at rest; scoped

**v1 resources (zod-validated, reuse internal services):**
contacts CRUD + import + segments · messages send (text/template, 24h rules) · templates · campaigns (create/list/status/start/pause/cancel/analytics) · conversations (list/assign/status/notes) · agents · flows (CRUD/publish/run-status) · analytics summary · `GET /api/v1/docs` (Swagger UI) + `openapi.json`

**Outbound webhooks (events to customer URLs):**
- `WebhookEndpoint { id, name, url, secret, events[], isActive, createdAt }` — HMAC-SHA256 `X-WAYAPP-Signature` (timestamp.payload) + `X-WAYAPP-Timestamp`
- `WebhookDelivery { id, endpointId, event, payload Json, attempts, nextRetryAt, status(PENDING/DELIVERED/FAILED), lastError, createdAt }`
- Worker queue: 5 attempts (1m/5m/30m/2h/12h), dead-letter, 2s timeout, 2xx = delivered, URLs-only payloads
- Events: `message.received`, `message.status_updated`, `contact.created`, `contact.updated`, `campaign.completed`, `template.status_changed`
- Settings UI: manage endpoints, test-ping, delivery log

## F6 — Web & Mobile Apps

**Native app (v1, after F5):**
- Expo + TypeScript + `expo-router`, Zustand, `@tanstack/react-query`, `expo-secure-store`, `expo-notifications`
- Screens: Login → Inbox (assignee + unread) → Chat (text/template/media, 24h indicator) → Contacts → Campaigns (status view) → Settings
- Push via worker → Expo push service (FCM/APNs); tap → deep link to conversation
- EAS build pipeline

**PWA (same milestone):** SW precache + network-first, raster icons (192/512 + apple-touch-icon-180), VAPID push, dvh layout. One delivery job, two push adapters.
