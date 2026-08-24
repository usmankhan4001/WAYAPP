# AI Coding Assistants & Agent Guidelines

Welcome to the **WAYAPP** codebase. This document is the primary instruction set for all AI agents (Antigravity, Cursor, Windsurf, GitHub Copilot, Gemini CLI, Claude Code) working on this repository.

---

## 1. System Architecture & Tech Stack

- **Framework:** Next.js 15 (App Router, Server Actions, Route Handlers)
- **Runtime:** Node.js 20+ / 22+ LTS
- **Database & ORM:** PostgreSQL 18 with Prisma ORM v6
- **Styling:** Tailwind CSS (Strictly NO inline styles)
- **Background Worker:** Standalone Node.js process (`src/worker/index.ts`) decoupled from web request lifecycles
- **Real-Time Stream:** Server-Sent Events (SSE) via `/api/chat/stream` + polling fallback (2500ms)
- **Meta WhatsApp Integration:** WhatsApp Business Cloud API (Graph API v21.0)
- **Containerization:** Docker multi-stage build, Dokploy PaaS, Cloudflare R2 automated backups

---

## 2. Directory Layout & Key Files

```
src/
├── app/
│   ├── api/
│   │   ├── auth/                  # JWT auth & session management
│   │   ├── chat/                  # Inbox, SSE stream, AI copilot, snippets, CRM
│   │   ├── campaigns/             # Broadcast campaign management & audience calculations
│   │   ├── automations/ & flows/  # Visual flow builder & chatbot engines
│   │   ├── webhooks/whatsapp/     # Inbound Meta webhook handler
│   │   └── v1/                    # Public Developer REST API & Swagger UI
│   ├── contacts/                  # Kanban CRM pipeline & contact management
│   ├── inbox/                     # WhatsApp Web standalone inbox interface
│   └── settings/                  # 3-tab switchboard & module configuration
├── components/
│   ├── inbox/                     # ChatWindow, AudioPlayer, VoiceRecorder, Lightbox
│   ├── flows/                     # Visual node canvas & interactive chat simulator
│   └── layout/                    # Sidebar, Header, AppShell, BottomNav
├── lib/
│   ├── auth/                      # jwt.ts, session.ts, rbac.ts
│   ├── whatsapp/                  # client.ts, phone.ts, signature.ts, automation.ts
│   ├── prisma.ts                  # Shared Prisma client instance
│   └── logger.ts                  # Structured pino logger
└── worker/
    ├── index.ts                   # Worker entrypoint, health endpoint (:3001), memory monitor
    ├── dispatcher.ts              # Token-bucket rate-limited broadcast sender
    ├── scheduler.ts               # Campaign poll loop (15s)
    ├── sweeper.ts                 # Self-healing crash recovery sweeper (60s)
    └── outbound-webhooks.ts       # HMAC-signed webhook delivery engine (5s)
```

---

## 3. Strict Coding Rules (Must Never Be Broken)

### 1. Styling
- **Rule:** **NEVER** use inline `style={{ ... }}` in JSX.
- **Enforcement:** Always use Tailwind CSS utility classes and `cn()` from `@/lib/utils`.

### 2. Error Handling
- **Rule:** **NEVER** use empty catch blocks (`.catch(() => {})` or `catch (err) {}` with no handling).
- **Enforcement:** Always log errors with `@/lib/logger` or appropriate console warning, and return meaningful error messages to users/callers.

### 3. Authentication & Authorization
- **Rule:** All internal `/api/*` routes must enforce session authentication using `requireAuth()` or `requireRole()`.
- **Rule:** All public `/api/v1/*` routes must validate SHA-256 API keys.

### 4. Database Integrity & Migrations
- **Rule:** **NEVER** run destructive database commands (such as `prisma db push --accept-data-loss` or dropping production tables).
- **Rule:** Preserve existing data, foreign key constraints, and cascade delete safeguards.

### 5. Meta 24-Hour WhatsApp Service Window
- **Rule:** Outside the 24-hour customer care window, free-form text/media messages are blocked by Meta.
- **Rule:** Always enforce template-only dispatch (`messageType: 'template'`) when `effectiveWindowActive` is false.

### 6. Background Worker Separation
- **Rule:** Long-running broadcasts, webhooks delivery, and scheduled cron tasks must execute inside `src/worker/` and NEVER block Next.js HTTP response threads.

---

## 4. Common Agent Workflows

### Adding a New API Route
1. Create `src/app/api/<feature>/route.ts`.
2. Authenticate the user via `const session = await requireAuth(req)`.
3. Wrap operations in a `try...catch` block.
4. Return `NextResponse.json({ error: '...' }, { status: 4xx/500 })` on failure.

### Adding a Database Field
1. Edit `prisma/schema.prisma`.
2. Run `npx prisma generate` to update types.
3. Test with `npx tsc --noEmit` and `npm run build`.

### Testing Changes
```bash
# Run Vitest test suite
npm test

# Run TypeScript typecheck
npx tsc --noEmit

# Run Next.js production build
npm run build
```
