# Hardening Checklist — Audit Findings & Remediation (P0–P9)

Condensed from the multi-agent deep-dive audit. Full narrative in `../PLAN.md`.

> **Status legend:** ✅ remediated · 🔶 partial · ⬜ not started (as of 2026-08-19)

## Critical findings (fix first)

| # | Finding | Location | Fix | Status |
|---|---|---|---|---|
| C1 | Live Meta credentials in git | `WABA API Cedentials.txt` | Rotate all Meta creds; purge history; gitleaks in CI (P0) | 🔶 code-side done — **user must rotate + purge history** |
| C2 | Passwordless login (passcode never validated) | `api/auth/login/route.ts:11`, `lib/auth/session.ts:18-50` | Password auth, remove hardcoded allowlists + 1-click button (P1) | ✅ |
| C3 | JWT hardcoded fallback secret + signature-bypass catch | `lib/auth/jwt.ts:3-6`, `middleware.ts:42-64,87-90` | Mandatory `AUTH_SECRET`, fail closed, `jose` (P1) | ✅ |
| C4 | No server-side authorization; middleware bypass (`pathname.includes('.')`) | `middleware.ts:79` | `requireAuth()`/`requireRole()` in every route (P1) | ✅ (14 routes + media + push + v1) |
| C5 | Webhook HMAC fail-open; public default verify token | `webhooks/whatsapp/route.ts:44`, `signature.ts:11-14` | Fail closed, random token, timing-safe compare (P4) | ✅ |
| C6 | `/api/settings` leaks access token + app secret | `api/settings/route.ts:41-51` | Explicit field pick, never spread row (P1) | ✅ |
| C7 | START/RESUME re-dispatches whole audience | `dispatch/route.ts:22-33`, `queue.ts:194-392` | Atomic state machine + `@@unique([campaignId, contactId])` dedup (P3) | ✅ (worker dispatcher + `skipDuplicates`) |
| C8 | `db push --accept-data-loss` on build/start; no migrations; destructive seed | `package.json:6-11`, `prisma/seed.ts:8-17` | `prisma migrate`, guard seed (P2) | ✅ |
| C9 | Unauthenticated upload → stored XSS; broken in Docker; lost on redeploy | `api/media/upload/route.ts:49,54`, `Dockerfile:41` | Auth, allowlist, chown + uploads volume (P1/P9) | ✅ (auth + rate limit + MIME allowlist + server-side extension; uploads volume ⬜) |

## High findings

| # | Finding | Location | Fix | Status |
|---|---|---|---|---|
| H1 | Webhook no dedup → P2002 crash loop; counters double-count; status regression | `webhooks/whatsapp/route.ts:101-209` | Upsert by wamid, transition-guarded increments (P4) | ✅ |
| H2 | Dispatcher = fire-and-forget IIFE; restart strands RUNNING; `scheduledAt` dead | `queue.ts:194`, no cron anywhere | Worker + pg-boss + sweeper + scheduler (P3) | ✅ (worker container, sweeper 60s; pg-boss ⬜ — shared in-memory queue) |
| H3 | Unhandled rejection can crash process | `queue.ts:194` | try/catch + terminal states (P3) | ✅ |
| H4 | Divergent phone normalizers; webhook `wa_id` without `+` | `lib/utils.ts:17-27`, `phone.ts:19` | Single normalizer (libphonenumber-js) (P4) | 🔶 normalizer exists; libphonenumber-js integration pending |
| H5 | 24h window guard claimed, not implemented | `chat/route.ts:122`, `automation.ts:100` | Enforce `lastInteractionAt` check (P4) | 🔶 verified in send paths; full coverage check pending |
| H6 | Mock mode can silently send to real Meta | `client.ts:40-41` vs `automation.ts:42-47` | Mock wins; centralize `createFromSettings` (P3) | ✅ |
| H7 | No input validation anywhere | all POST/PUT routes | zod schemas (P5) | 🔶 v1 routes zod-validated; dashboard routes pending |
| H8 | `error.message` leaked to clients | ~every route | Log server-side, generic + correlation ID (P5) | ⬜ |
| H9 | Opted-out/blocked never auto-suppressed | `errors.ts:88-94`, `queue.ts:26-29` | 130472 → UNSUBSCRIBED; STOP handler (P4) | ✅ (130472 auto-suppression) |
| H10 | Automations: no cooldown, ReDoS, bot loops | `automation.ts:75-82` | Cooldowns, caps, depth limit, worker execution (P4) | 🔶 depth/bot-loop guards; cooldown caps pending |
| H11 | SQLite: no WAL/busy_timeout; single-instance only | `lib/prisma.ts` | PostgreSQL (P2) | ✅ |
| H12 | CI build-only; zero tests in repo | `.github/workflows/ci.yml`, package.json | Vitest + lint + typecheck + gitleaks (P8) | 🔶 vitest suite exists (18 pass / 10 DB-dependent fail); CI job ⬜ |
| H13 | OAuth: no state/PKCE; synthetic emails pass whitelist | `auth/meta/callback/route.ts:56` | state cookie + PKCE, reject email-less (P1) | ✅ |
| H14 | Media proxy buffers whole files, unauthenticated | `client.ts:775-797` | Stream + byte cap + cache (P5) | 🔶 auth + rate limit + no-store; byte cap pending |
| H15 | Chat messages never get delivered/read statuses | `webhooks/whatsapp/route.ts:97` | Also update ChatMessage by wamid (P4) | 🔶 status transition code exists; verified wiring pending |
| H16 | `.env` baked into Docker build; dead `NEXT_PUBLIC_APP_URL` | `.dockerignore`, README | Exclude .env; fix env docs (P9) | 🔶 `.dockerignore` excludes `.env`; README env docs pending |

## Medium findings (short list)

- No error boundaries / swallowed fetch errors (P7) — 🔶 NotificationProvider + TemplateBuilderModal hook-order fixed; `error.tsx`/`not-found.tsx` ⬜
- 3 concurrent `/api/chat` pollers, no abort (P7) — ⬜
- Template double-send on row click (P7) — ⬜
- a11y: clickable divs, missing aria-labels, no focus traps (P7) — ⬜
- No virtualization; search per keystroke (P7) — ⬜
- PWA: sw.js no fetch handler, SVG-only icons, fake push (P8) — 🔶 real push subscription endpoint added (auth + dedup); SW/VAPID ⬜
- `h-[680px]` mobile overflow; missing safe-area (P7) — ⬜
- No health endpoint / HEALTHCHECK / structured logging (P8) — ✅ health endpoint + worker health server (3001) + compose healthchecks; pino ⬜
- No rate limiting; no security headers (P1) — ✅ rate limits (auth, webhooks, media, v1, settings); security headers ⬜
- Template sync >250 truncated; no delete (P6) — ✅ paginated via `paging.next`; DELETE ⬜
- Analytics UTC bucketing, inconsistent denominators (P6) — ⬜
- Logout GET; sessions unrevocable 7 days (P1) — ✅ POST logout + session table (jti revocable)
- Segments & automation triggerTypes dead code (P6) — 🔶 segment rules used in `getTargetContacts`; full triggerType set ⬜
- Header `{{1}}` vars unmappable (P6) — ✅ `headerVariables` in dispatcher + wizard mapping

## Positive findings (keep)

- Prisma singleton pattern correct (`lib/prisma.ts`)
- Client/server boundary clean; `tsc --noEmit` passes strict
- No XSS sinks (no dangerouslySetInnerHTML) anywhere
- `.env` + `dev.db` gitignored; httpOnly/secure/sameSite cookies
- JSON-string columns read defensively; tag/group duplicate handling; error-category mapping in chat
