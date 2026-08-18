/**
 * Database schema initialization
 * Schema migrations are handled cleanly via Prisma (`prisma migrate` / `prisma db push`).
 */
export async function ensureDatabaseSchema(): Promise<void> {
  // Schema is managed via Prisma migrations. No runtime DDL needed.
  return Promise.resolve();
}
