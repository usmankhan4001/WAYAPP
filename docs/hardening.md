# Hardening Checklist — Audit Findings & Remediation (P0–P9)

Condensed from the multi-agent deep-dive audit. Full narrative in `../PLAN.md`.

## Critical findings (fix first)

| # | Finding | Location | Fix |
|---|---|---|---|
| C1 | Live Meta credentials in git | `WABA API Cedentials.txt` | Rotate all Meta creds; purge history; gitleaks in CI (P0) |
| C2 | Passwordless login (passcode never validated) | `api/auth/login/route.ts:11`, `lib/auth/session.ts:18-50` | Password auth, remove hardcoded allowlists + 1-click button (P1) |
| C3 | JWT hardcoded fallback secret + signature-bypass catch | `lib/auth/jwt.ts:3-6`, `middleware.ts:42-64,87-90` | Mandatory `AUTH_SECRET`, fail closed, `jose` (P1) |
| C4 | No server-side authorization; middleware bypass (`pathname.includes('.')`) | `middleware.ts:79` | `requireAuth()`/`requireRole()` in every route (P1) |
| C5 | Webhook HMAC fail-open; public default verify token | `webhooks/whatsapp/route.ts:44`, `signature.ts:11-14` | Fail closed, random token, timing-safe compare (P4) |
| C6 | `/api/settings` leaks access token + app secret | `api/settings/route.ts:41-51` | Explicit field pick, never spread row (P1) |
| C7 | START/RESUME re-dispatches whole audience | `dispatch/route.ts:22-33`, `queue.ts:194-392` | Atomic state machine + `@@unique([campaignId, contactId])` dedup (P3) |
| C8 | `db push --accept-data-loss` on build/start; no migrations; destructive seed | `package.json:6-11`, `prisma/seed.ts:8-17` | `prisma migrate`, guard seed (P2) |
| C9 | Unauthenticated upload → stored XSS; broken in Docker; lost on redeploy | `api/media/upload/route.ts:49,54`, `Dockerfile:41` | Auth, allowlist, chown + uploads volume (P1/P9) |

## High findings

| # | Finding | Location | Fix |
|---|---|---|---|
| H1 | Webhook no dedup → P2002 crash loop; counters double-count; status regression | `webhooks/whatsapp/route.ts:101-209` | Upsert by wamid, transition-guarded increments (P4) |
| H2 | Dispatcher = fire-and-forget IIFE; restart strands RUNNING; `scheduledAt` dead | `queue.ts:194`, no cron anywhere | Worker + pg-boss + sweeper + scheduler (P3) |
| H3 | Unhandled rejection can crash process | `queue.ts:194` | try/catch + terminal states (P3) |
| H4 | Divergent phone normalizers; webhook `wa_id` without `+` | `lib/utils.ts:17-27`, `phone.ts:19` | Single normalizer (libphonenumber-js) (P4) |
| H5 | 24h window guard claimed, not implemented | `chat/route.ts:122`, `automation.ts:100` | Enforce `lastInteractionAt` check (P4) |
| H6 | Mock mode can silently send to real Meta | `client.ts:40-41` vs `automation.ts:42-47` | Mock wins; centralize `createFromSettings` (P3) |
| H7 | No input validation anywhere | all POST/PUT routes | zod schemas (P5) |
| H8 | `error.message` leaked to clients | ~every route | Log server-side, generic + correlation ID (P5) |
| H9 | Opted-out/blocked never auto-suppressed | `errors.ts:88-94`, `queue.ts:26-29` | 130472 → UNSUBSCRIBED; STOP handler (P4) |
| H10 | Automations: no cooldown, ReDoS, bot loops | `automation.ts:75-82` | Cooldowns, caps, depth limit, worker execution (P4) |
| H11 | SQLite: no WAL/busy_timeout; single-instance only | `lib/prisma.ts` | PostgreSQL (P2) |
| H12 | CI build-only; zero tests in repo | `.github/workflows/ci.yml`, package.json | Vitest + lint + typecheck + gitleaks (P8) |
| H13 | OAuth: no state/PKCE; synthetic emails pass whitelist | `auth/meta/callback/route.ts:56` | state cookie + PKCE, reject email-less (P1) |
| H14 | Media proxy buffers whole files, unauthenticated | `client.ts:775-797` | Stream + byte cap + cache (P5) |
| H15 | Chat messages never get delivered/read statuses | `webhooks/whatsapp/route.ts:97` | Also update ChatMessage by wamid (P4) |
| H16 | `.env` baked into Docker build; dead `NEXT_PUBLIC_APP_URL` | `.dockerignore`, README | Exclude .env; fix env docs (P9) |

## Medium findings (short list)

- No error boundaries / swallowed fetch errors (P7)
- 3 concurrent `/api/chat` pollers, no abort (P7)
- Template double-send on row click (P7)
- a11y: clickable divs, missing aria-labels, no focus traps (P7)
- No virtualization; search per keystroke (P7)
- PWA: sw.js no fetch handler, SVG-only icons, fake push (P8)
- `h-[680px]` mobile overflow; missing safe-area (P7)
- No health endpoint / HEALTHCHECK / structured logging (P8)
- No rate limiting; no security headers (P1)
- Template sync >250 truncated; no delete (P6)
- Analytics UTC bucketing, inconsistent denominators (P6)
- Logout GET; sessions unrevocable 7 days (P1)
- Segments & automation triggerTypes dead code (P6)
- Header `{{1}}` vars unmappable (P6)

## Positive findings (keep)

- Prisma singleton pattern correct (`lib/prisma.ts`)
- Client/server boundary clean; `tsc --noEmit` passes strict
- No XSS sinks (no dangerouslySetInnerHTML) anywhere
- `.env` + `dev.db` gitignored; httpOnly/secure/sameSite cookies
- JSON-string columns read defensively; tag/group duplicate handling; error-category mapping in chat
