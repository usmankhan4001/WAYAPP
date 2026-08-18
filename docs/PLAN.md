# WAYAPP — Security Hardening & Product Roadmap

> Consolidated plan: audit remediation (P0–P9) + WATI-competitive feature build (F1–F6)
> Stack: Next.js 15 / React 19 / Prisma / **PostgreSQL** / **separate worker container** / **password auth**

## 0. Executive Summary

The app has a strong feature surface and clean TypeScript, but is **not production-safe today**: live Meta credentials are committed to a public repo, authentication is bypassable by anyone who reads the code, the broadcast engine double-sends on resume/restart, and there are zero database migrations. This plan fixes all of it and adds the 6-product feature set on top.

**Critical known issues (fix first):**

| # | Issue | Location |
|---|---|---|
| 1 | Live Meta credentials committed to git | `WABA API Cedentials.txt` (tracked) |
| 2 | Passwordless login; passcode never validated; hardcoded allowlists | `api/auth/login/route.ts:11`, `lib/auth/session.ts:18-50` |
| 3 | JWT hardcoded fallback secret + signature-bypass catch | `lib/auth/jwt.ts:3-6`, `middleware.ts:42-64,87-90` |
| 4 | Zero server-side route authorization (middleware only, bypassable) | `middleware.ts:79`, all `api/**` routes |
| 5 | Webhook HMAC fail-open; public default verify token | `webhooks/whatsapp/route.ts:44`, `lib/whatsapp/signature.ts:11-14` |
| 6 | `/api/settings` leaks full access token + app secret to browser | `api/settings/route.ts:41-51` |
| 7 | START/RESUME re-dispatches entire audience (duplicate sends) | `campaigns/[id]/dispatch/route.ts:22-33`, `lib/whatsapp/queue.ts:194-392` |
| 8 | `prisma db push --accept-data-loss` on build/start; no migrations; destructive seed | `package.json:6-11`, `prisma/seed.ts:8-17` |
| 9 | Unauthenticated media upload → stored XSS; broken in Docker; lost on redeploy | `api/media/upload/route.ts:49,54`, `Dockerfile:41` |

---

## Phase 0 — Emergency Incident Response (hours, do first)

| # | Task | Who |
|---|---|---|
| 0.1 | **Revoke/rotate ALL Meta credentials** in Meta Developer Portal (permanent token, temporary token, app secret) — the permanent token is burned | Manual |
| 0.2 | `git rm --cached "WABA API Cedentials.txt"`, add `*.txt` secret patterns to `.gitignore`, **purge git history** (`git filter-repo`/BFG) + force-push | Scripted |
| 0.3 | Set repo private until purge completes; check for forks | Manual |
| 0.4 | Add **gitleaks** pre-commit hook + CI secret-scan job | Scripted |
| 0.5 | Set strong `AUTH_SECRET` on deployed instance immediately (`openssl rand -base64 48`) | Manual |

---

## Phase 1 — Auth & Security (password-based)

**Auth model** (replaces passwordless + 1-click admin):

- `User` model: add `passwordHash` (argon2id/bcrypt)
- `/api/auth/login`: validate email+password (timing-safe); keep `AuthConfig.allowedDomains/allowedEmails` as secondary gate; **remove** hardcoded allowlists + first-user-SUPER_ADMIN rule; remove "1-Click Admin Sign-In" button (`login/page.tsx:104`)
- Add `/api/auth/register` (invite-only, first-user bootstraps admin) + admin password-reset flow (SMTP optional — fallback: admin-generated reset link)
- `jwt.ts` + `middleware.ts`: **fail closed** — no hardcoded fallback secret; startup fails if `AUTH_SECRET` missing; `catch` returns `null` on any verify error; enforce `alg=HS256`; use `jose`
- Sessions: `jti` + server-side session table (revocable), 24h expiry + refresh, logout = `POST` only
- **RBAC**: `requireAuth()` / `requireRole('ADMIN')` helpers called in every route; ADMIN-only: settings, dispatch, import, delete
- Middleware: replace `pathname.includes('.')` bypass with explicit allowlist; fix `/api/media` exposure
- Meta OAuth: `state` in signed cookie + PKCE; **reject** email-less profiles (no `@meta.gccstartup.com` synthesis)
- `/api/settings`: pick fields explicitly — never spread Prisma row; only `accessTokenMasked`
- Encrypt `Settings.accessToken`/`appSecret` at rest (AES-256-GCM, key derived from env)
- Security headers in `next.config.mjs`: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy; disable `poweredByHeader`
- Rate limits (in-memory bucket): `/api/auth/login`, `/api/webhooks/whatsapp`, `/api/settings`

## Phase 2 — Data Layer: PostgreSQL + Migrations

- `docker-compose.yml`: add `postgres:16` service (volume `pg_data`, healthcheck `pg_isready`); `DATABASE_URL=postgresql://wayapp:...@postgres:5432/wayapp`
- Schema: `provider = "postgresql"`; add indexes — `CampaignMessage(campaignId)`, `CampaignMessage(phoneNumber)`, `ChatMessage(contactId)`, `Contact(status)`, `CampaignMessage(createdAt)`, **`@@unique([campaignId, contactId])`**
- `prisma migrate dev --name init` → `prisma/migrations/`; **remove `--accept-data-loss`** from all scripts; entrypoint runs `prisma migrate deploy` (pin prisma CLI in runner image)
- One-off SQLite→Postgres data migration script (rehearsed against a copy first)
- `seed.ts`: refuse in production without `--force`; use upserts
- Remove `src/lib/db-init.ts` runtime DDL

## Phase 3 — Broadcast Engine: Separate Worker + Durability

**Architecture:** second container (same image), **pg-boss** job queue (Postgres-backed; BullMQ+Redis as alternative), worker = dispatcher + scheduler + sweeper + bot/flow/webhook-delivery consumers.

- `queue.ts` split into `src/worker/`; dispatch loop moves out of Next.js process
- **Idempotency**: create only non-existing `(campaignId, contactId)` rows (`createMany skipDuplicates`); RESUME continues from PENDING — no re-send
- **Atomic state machine**: `updateMany({ where: { id, status: { in: [DRAFT,QUEUED,PAUSED] } }, data: { status: 'RUNNING' } })` → 0 rows = reject; transition table enforced; DELETE blocked while QUEUED/RUNNING
- **Recovery sweeper** (60s): stuck RUNNING >5min → re-enqueue; on boot re-enqueue RUNNING/QUEUED; `try/finally` → COMPLETED/FAILED
- **Scheduler** (30s poll): `SCHEDULED && scheduledAt <= now` → enqueue; wire date picker into `CampaignWizard`
- Rate limiting: shared token bucket honoring `rateLimitPerSecond` + enforce `tierDailyLimit`; `SENDING` state before Meta call (closes crash-window double-send); persist wamid immediately
- Counters: transition-guarded `increment` only; nightly reconciliation from `CampaignMessage`
- **Mock mode**: mock wins when `isMock && hasLiveCreds`; centralize client construction in `createFromSettings`

## Phase 4 — Webhook Reliability & Messaging Correctness

- **Fail closed**: no appSecret → 401; random `webhookVerifyToken` at first boot (remove hardcoded defaults in `schema.prisma:18`, `db-init.ts:24`, `settings/route.ts`); `timingSafeEqual`; ack 200 fast, per-item isolated try/catch
- **Idempotency**: inbound `chatMessage.upsert` by `wamid`; status updates only on real transitions (`PENDING<SENT<DELIVERED<READ<REPLIED`, FAILED terminal) — kills P2002 retry loop + counter inflation
- Apply delivered/read to `ChatMessage` too (inbox receipts)
- **Single phone normalizer** (libphonenumber-js): webhook `wa_id` + prefix fix (duplicate contacts, reply attribution); E.164 validation before every send
- **24h window guard**: `now - lastInteractionAt < 24h` before free-text in `chat/route.ts` + `automation.ts`
- **Auto-suppression**: Meta 130472 → `Contact.status = UNSUBSCRIBED`; STOP keyword handler + unsubscribe endpoint
- Automation hardening: cooldown/daily cap/depth limit; ReDoS-safe regex; execution moved to worker
- REPLIED attribution: within 24h only, on SENT→REPLIED transition only

## Phase 5 — API Hardening

- **zod** schemas for every request body (enums, dates, E.164, JSON-shape for JSON-string columns, range clamps)
- Generic error responses + server-side logging + correlation ID (replace `error.message` leaks); fix wrong status codes (templates 400→502/500)
- Media upload: auth, extension/MIME whitelist + magic bytes, `Content-Disposition: attachment` + nosniff, quota caps, env-configured dir; proxy: stream with byte cap + server-side cache
- Pagination: contacts (cursor), campaigns, analytics
- Import: 10k row cap + body size cap, batched `createMany` transactions, no empty-string overwrites, redact phones in errors
- Transactions around multi-write webhook/status paths

## Phase 6 — Product Correctness

- Segments: implement rule evaluation in `getTargetContacts` or remove
- Automation `triggerType`: implement CAMPAIGN_REPLY/NEW_CONTACT/BUTTON_CLICK or remove
- Template sync: paginate `paging.next` (>250 fix), prune stale, DELETE endpoint with in-use check
- Header `{{N}}` variable mapping in wizard (currently always "fullName")
- Analytics: event-timestamp bucketing in fixed TZ, consistent denominators, `range=all` beyond 30 days
- Enforce `isConnected` gate on all send paths

## Phase 7 — Frontend Robustness

- `error.tsx` + `not-found.tsx`; `fetchJSON` throwing on `!res.ok`; toast surface instead of `.catch(() => {})`
- Consolidate 3 pollers → one hook + AbortController + stale-response guard + pause on `document.hidden`; auto-scroll only near bottom
- Template send `isSending` row-level guard; optimistic bubbles with rollback
- Debounce contacts search (300ms) + audience calculator; `Promise.allSettled` in wizard
- a11y: aria-labels, `<button>` for clickable divs, modal focus traps + Escape, contrast fixes
- `React.memo` list rows; virtualize/paginate message log + contacts
- Mobile: `h-[calc(100dvh-14rem)]`, safe-area insets; remove dead `recharts` dep

## Phase 8 — Ops, Observability, Tests, PWA

- `GET /api/health` (DB + queue) + Docker `HEALTHCHECK` + compose healthcheck
- **pino** structured logging (JSON stdout) + request-log middleware + optional `@sentry/nextjs`
- **Vitest suite**: signature HMAC, JWT, phone normalization, queue state machine, webhook idempotency, dispatch dedup; CI runs lint + `tsc --noEmit` + `prisma validate` + `vitest run` + build + Docker build + gitleaks
- PWA: SW precache + network-first, raster icons (192/512 + apple-touch-180), **real push (VAPID)** via worker delivery
- Postgres backups: `pg_dump` scheduled + documented restore

## Phase 9 — Docs & Config Hygiene

- `.env.example`: `AUTH_SECRET` (REQUIRED), `META_APP_ID`, `META_APP_SECRET`, `DATABASE_URL`, `PORT`, `NODE_ENV`; remove dead `NEXT_PUBLIC_APP_URL` (or implement)
- `.dockerignore`: exclude `.env`; Dockerfile `--chown=nextjs` + uploads volume; pin `node:20-alpine`
- README: Dokploy section (Postgres, worker container, AUTH_SECRET, single-instance note), backup/restore docs, `robots.txt`

---

# Feature Build (F1–F6)

## Gap Analysis

| Feature | Today | Build |
|---|---|---|
| F1 Flow Builder | — | Everything (model, canvas, executor) |
| F2 Keyword & AI Bots | Keyword automations only, inline in webhook | AI/HTTP bots, OpenRouter, Knowledge Base |
| F3 Bulk Campaigns | Core engine exists | Scheduler, durability, suppression (P3) |
| F4 Multi-Agent Inbox | Single-user ad-hoc conversations | Conversation model, assignment, collaboration |
| F5 REST API & Webhooks | Internal routes only | Public v1 API, keys, outbound webhooks, docs |
| F6 Web & Mobile Apps | Responsive web + partial PWA | Native Expo app + real PWA |

## F1 — No-Code Flow Builder (core nodes)

**Models:** `Flow { id, name, status(DRAFT/PUBLISHED/ARCHIVED), nodesJson, edgesJson, version, createdBy }`, `FlowRun { flowId, contactId, currentNodeId, variables, status(ACTIVE/COMPLETED/ERROR) }`, `FlowLog { runId, nodeId, action, status, error }`

**Nodes:** Trigger (keyword/ANY_INBOUND/new contact) · Message (text/template/media + variables) · Quick replies (≤3 buttons → branch) · Condition (attribute/variable compare) · Delay (minutes/hours, `resumeAt` poller) · Action (ADD/REMOVE_TAG, ADD_TO_GROUP, UPDATE_CONTACT) · GoTo/Jump · End

**Engine (worker):** inbound → match flow → create `FlowRun` → advance node-by-node via throttled queue; delay nodes resume on 15s poller; guards: max 50 nodes/run, 10 runs/contact/day, loop protection; positions persisted for crash-resume

**UI:** `src/app/flows/` with `@xyflow/react`: palette, drag-drop canvas, inline editors, edge validation, live simulator panel, publish/unpublish, JSON version snapshots. Automations gain a "Flow" action type.

## F2 — Keyword & AI Bots

**Model:** evolve `Automation` → `Bot { name, kind(KEYWORD|AI|HTTP), triggerConfig, aiConfig, actionsJson, isActive, cooldownSeconds, dailyCap }`

**AI providers:** OpenAI · Anthropic · Gemini · **OpenRouter** · any OpenAI-compatible endpoint — one client in `lib/ai/provider.ts`, per-bot API keys (encrypted)

**Knowledge Base generator:** `KnowledgeBase { name, sourceType(GENERATED|UPLOADED), rawNotes, contentMarkdown, chunks, status }` — admin pastes business notes/FAQ → AI generates structured KB → review/edit → READY; bots attach KB (top-k chunk retrieval stuffed into system prompt, cap 8k tokens; EMBED mode later); memory = last-5 `ChatMessage`

**HTTP bots:** POST inbound message to user URL, response text sent back (24/7 API integration)

**Guardrails:** per-(bot,contact) cooldown, daily cap, depth limit, ReDoS-safe regexes, no bot→bot loops (bot-sent messages never trigger bots)

**Execution:** webhook enqueues `BotTriggerEvent` → worker consumes (fixes current fire-and-forget) → `AutomationLog` per execution

## F3 — Bulk Campaigns (complete the engine)

All hardening-P3 items = this feature: scheduler + date picker, idempotent dispatch, atomic state machine, recovery sweeper, auto-suppression, counter reconciliation. **Enhancements:** campaign clones/drafts, "send-again to non-repliers" list, audience preview CSV export.

## F4 — Multi-Agent Team Inbox

**Models:** `Conversation { contactId, assignedToId, status(OPEN/PENDING/RESOLVED/SPAM), lastMessageAt, unreadCount }`, `ConversationNote { conversationId, authorId, body }`, `ConversationEvent { conversationId, actorId, type(ASSIGNED/UNASSIGNED/STATUS_CHANGED/NOTE_ADDED/TRANSFERRED), payload }`

- `/api/chat` switches from ad-hoc grouping to real `Conversation` rows (auto-create on inbound, backfill migration)
- Assignment: assign/unassign, "Taken by me", optional round-robin (skips away agents), transfer with note; audit trail via `ConversationEvent`
- Filters: Mine / Unassigned / All / Resolved; per-agent unread; internal notes (never sent to customer)
- RBAC: MEMBER chats + self-assigns; ADMIN assigns anyone/resolves/manages routing; VIEWER read-only
- UI: assignee chip + status dot + unread badge on rows; assignee picker + notes panel

## F5 — Public REST API & Webhooks (full surface)

**Auth modes** (shared `lib/api/` middleware, rate limits both):

- `Bearer` token: `POST /api/v1/auth/token` (email+password → short-lived JWT + refresh) — for the mobile app
- `X-API-Key`: `ApiKey { name, keyHash, scopes, lastUsedAt, expiresAt, revokedAt }`, shown once, SHA-256 at rest

**Resources (v1, zod-validated, reusing internal services):**

- Contacts: CRUD + import status + segments
- Messages: send text/template (24h rules enforced)
- Templates: read, status
- Campaigns: create, list, status, start/pause/cancel, analytics
- Conversations: list, assign, status, notes
- Agents: list
- Flows: CRUD + publish + run-status
- Analytics: summary
- `POST /api/v1/auth/token`, `GET /api/v1/docs` (Swagger UI), `openapi.json` export

**Outbound Webhooks** (events to customer URLs — distinct from Meta inbound):

- `WebhookEndpoint { name, url, secret, events[], isActive }` — HMAC-SHA256 `X-WAYAPP-Signature` (timestamp.payload), `X-WAYAPP-Timestamp`
- `WebhookDelivery { endpointId, event, payload, attempts, nextRetryAt, status }` — worker queue, 5 attempts (1m/5m/30m/2h/12h), dead-letter, 2s timeout, URLs-only payloads (no binaries)
- Events: `message.received`, `message.status_updated`, `contact.created/updated`, `campaign.completed`, `template.status_changed`
- Settings UI: endpoints, test-ping, delivery log

## F6 — Web & Mobile Apps

**Native app (v1, ships after F5):**

- Expo + TypeScript + `expo-router`, Zustand, `@tanstack/react-query`, `expo-secure-store`, `expo-notifications`
- Screens: Login → Inbox (assignee + unread) → Chat (text/template/media, 24h indicator) → Contacts → Campaigns (read-only status) → Settings
- Push: worker delivery via Expo push service (FCM/APNs); background tap → deep link to conversation
- EAS build pipeline; README self-build docs

**PWA (web, same milestone):** SW precache + network-first, raster icons, VAPID push, dvh layout — one delivery job, two push adapters

---

# Combined Milestones

```
M0  P0–P2   Emergency + password auth/RBAC + Postgres/migrations          ← foundation
M1  P3–P4   Worker + webhook reliability + F3 campaigns complete          ← engine
M2  F1      Flow builder (core nodes + simulator)
M3  F2      AI/HTTP bots + OpenRouter + Knowledge Base generator
M4  F4      Multi-agent inbox
M5  F5      Public API v1 (full surface) + outbound webhooks + docs
M6  F6+P8   Expo native app + PWA offline/push + observability + tests
M7  P9      Docs & config hygiene + backups
```

**Dependencies:** F6 → M5 → M4 → M0. F1/F2/F4 → M1. F3 = M1. Tests ride along each milestone.

**Risks:**

1. git history purge must coordinate with repo visibility/forks
2. SQLite→PG migration rehearsed on a copy first
3. Meta token rotation breaks the live integration — schedule a maintenance window
4. Single-instance worker constraint must be documented (no replicas)

---

## Decision Log

| Decision | Choice |
|---|---|
| Auth model | Password-based (email + hashed password), RBAC roles |
| Database | PostgreSQL + `prisma migrate` |
| Dispatch architecture | Separate worker container (pg-boss queue) |
| AI providers | OpenAI, Anthropic, Gemini, OpenRouter, OpenAI-compatible + Knowledge Base generator |
| Flow builder | Core nodes (message, quick replies, condition, delay, tag/group actions, GoTo) |
| Mobile | Native Expo app now (consumes v1 API) |
| REST API v1 | Full surface (contacts, messages, templates, campaigns, conversations, agents, flows, analytics) |
