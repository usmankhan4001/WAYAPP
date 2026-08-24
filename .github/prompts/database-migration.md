# AI Prompt Template: Safe Database Migrations

You are modifying or extending the Prisma schema in WAYAPP.

## Strict Rules:
1. **Zero Data Loss Guarantee:**
   - NEVER drop columns or tables without explicit migration scripts.
   - All schema additions must be nullable (`String?`, `Int?`) or provide a safe `@default(...)`.
2. **Schema Location:**
   - Edit `prisma/schema.prisma`.
3. **Execution Steps:**
   - Run `npx prisma generate` to rebuild the `@prisma/client`.
   - Run `npx prisma db push` during development or generate migrations for production.
4. **Standalone Sync:**
   - Remember that Docker runtime uses `docker-entrypoint.sh` to mirror generated `.prisma` client artifacts into Next.js standalone paths.
5. **Verification:**
   - Run `npx tsc --noEmit` and `npm run build` to ensure type safety across all queries.
