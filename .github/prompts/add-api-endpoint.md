# AI Prompt Template: Add New API Endpoint

You are tasked with creating or extending an API endpoint in WAYAPP.

## Requirements:
1. **Directory Placement:** Create route handler under `src/app/api/<feature>/route.ts` (or `src/app/api/v1/<feature>/route.ts` for public v1 API).
2. **Authentication:**
   - Internal API: `const session = await requireAuth(request);` from `@/lib/auth/session`.
   - Public v1 API: Validate `X-API-Key` using `@/lib/auth/api-keys`.
3. **Validation & Typing:**
   - Parse JSON safely with `try...catch`.
   - Validate required fields and return 400 Bad Request on invalid payload.
4. **Database Access:**
   - Use `prisma` from `@/lib/prisma`.
   - Never perform unindexed table scans or unparameterized raw queries.
5. **Error Handling:**
   - Log errors using `@/lib/logger` (no swallowed errors).
   - Return structured error JSON: `NextResponse.json({ error: 'Message' }, { status: 500 })`.
6. **Testing:**
   - Verify endpoint with `npx tsc --noEmit` and add a corresponding test in `src/__tests__/`.
