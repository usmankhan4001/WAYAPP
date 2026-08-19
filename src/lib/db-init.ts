import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { ensureDefaultFlows } from '@/lib/whatsapp/conversation-engine';

let isInitialized = false;

/**
 * Ensures the default Settings row exists.
 *
 * IMPORTANT: No DDL here. Table/column structure is owned exclusively by
 * Prisma migrations (prisma/migrations/), which run at container startup
 * (see docker-entrypoint.sh). This bootstrap only seeds idempotent default
 * rows using the Prisma client API, so it behaves identically on SQLite and
 * PostgreSQL. The webhook verify token is random on every fresh database.
 */
async function ensureDefaultSettings(): Promise<void> {
  const existing = await prisma.settings.findUnique({
    where: { id: 'default' },
  });
  if (existing) return;

  try {
    await prisma.settings.create({
      data: {
        id: 'default',
        businessName: 'My WhatsApp Business',
        businessPhone: '',
        defaultCountryCode: '+1',
        rateLimitPerSecond: 20,
        tierDailyLimit: 1000,
        qualityRating: 'GREEN',
        isMockMode: false,
        isConnected: false,
        marketingMessagesEnabled: false,
        marketingMessagesPolicy: 'CLOUD_API_FALLBACK',
        webhookVerifyToken: crypto.randomBytes(24).toString('hex'),
      },
    });
    logger.info('[Database] Created default Settings row with random webhook verify token');
  } catch (err: any) {
    // Race with another booting process that created the row first
    logger.warn({ error: err.message }, '[Database] Default Settings row already exists (skipped)');
  }
}

/**
 * Ensures the default AuthConfig row exists.
 */
async function ensureDefaultAuthConfig(): Promise<void> {
  const existing = await prisma.authConfig.findUnique({
    where: { id: 'default' },
  });
  if (existing) return;

  try {
    await prisma.authConfig.create({
      data: {
        id: 'default',
        allowedDomains: 'gccstartup.com',
        allowedEmails: '',
        requireAuth: true,
        allowRegistration: true,
      },
    });
    logger.info('[Database] Created default AuthConfig row');
  } catch (err: any) {
    logger.warn({ error: err.message }, '[Database] Default AuthConfig row already exists (skipped)');
  }
}

/**
 * Idempotent database bootstrap. Safe to call on every boot / every request;
 * it performs no DDL, only idempotent default-row seeding.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (isInitialized) return;

  try {
    await ensureDefaultSettings();
    await ensureDefaultAuthConfig();
    await ensureDefaultFlows().catch((err: any) => {
      logger.warn({ error: err.message }, '[Database] Default flows seeding skipped');
    });

    isInitialized = true;
    logger.info('[Database] Bootstrap completed successfully');
  } catch (error: any) {
    logger.warn({ error: error.message }, '[Database] Bootstrap skipped or non-blocking');
  }
}
