# Gemini & AI Assistant Rules — Database & Code Integrity

## 1. Zero Data Loss Guarantee
- **Strict Database Rule:** NEVER execute commands or migrations that drop existing tables, truncate columns, or force schema syncs with `--accept-data-loss`.
- **Backward Compatibility:** All Prisma schema modifications must be additive (new nullable columns or columns with safe defaults) to prevent downtime during container rolling deployments.
- **Dedicated Cloudflare R2 Backups:** Database backups belong exclusively to the `wayapp-backups` bucket. Never mix WAYAPP database dumps with CMS or unrelated project buckets.

## 2. Code Quality & Linting Rules
- **No Inline Styles:** Use Tailwind CSS exclusively.
- **No Swallowed Errors:** Never use empty `.catch(() => {})`. Always log or bubble errors with structured context.
- **Session Protection:** All API endpoints must enforce `requireAuth(request)` from `@/lib/auth/session`.
- **Edge Runtime Safety:** Do not import Node.js built-ins (`crypto`, `fs`, `path`) directly in Edge Middleware (`src/middleware.ts`). Use `jose` and Web Standard APIs.

## 3. Meta API & Compliance
- **24h Customer Window:** Do not attempt to send direct free-form messages to contacts whose 24-hour window has expired; route through pre-approved WhatsApp templates instead.
- **Rate Limit Adherence:** Broadcast dispatches must use the token-bucket queue in `src/worker/dispatcher.ts`.

## 4. Verification Protocol
Before marking any AI task complete:
1. Run `npx prisma generate`
2. Run `npx tsc --noEmit`
3. Run `npm test`
4. Run `npm run build`
