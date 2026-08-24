# AI Coding Assistants Guide

## Architecture
- **Framework:** Next.js 15
- **Database:** Prisma with PostgreSQL
- **Styling:** Tailwind CSS

## Key Files & Directories
- `src/lib/dispatcher.ts` - Core message dispatcher
- `src/app/api/webhooks/` - Incoming webhook handlers
- `src/app/analytics/` - Analytics components and logic

## Strict Rules
- **Styling:** Do NOT use inline styles. Always use Tailwind classes.
- **Authentication:** All API routes must enforce authentication using `requireAuth`.
- **Error Handling:** Avoid empty catch blocks (`.catch(() => {})`). Always log or handle errors properly.
