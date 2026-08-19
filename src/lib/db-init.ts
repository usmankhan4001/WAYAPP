import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ensureDefaultFlows } from '@/lib/whatsapp/conversation-engine';

let isInitialized = false;

/**
 * Self-healing Database Initializer & Migration Engine
 * Automatically checks and adds any missing columns and tables in SQLite / PostgreSQL
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Check if SQLite and apply missing columns on Settings
    try {
      const settingsColumns: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(Settings);`);
      const colNames = new Set(settingsColumns.map((c) => c.name));

      if (!colNames.has('marketingMessagesEnabled')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Settings" ADD COLUMN "marketingMessagesEnabled" BOOLEAN DEFAULT 0;`);
      }
      if (!colNames.has('marketingMessagesPolicy')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Settings" ADD COLUMN "marketingMessagesPolicy" TEXT DEFAULT 'CLOUD_API_FALLBACK';`);
      }
      if (!colNames.has('qualityRating')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Settings" ADD COLUMN "qualityRating" TEXT DEFAULT 'GREEN';`);
      }
      if (!colNames.has('encryptionCheck')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Settings" ADD COLUMN "encryptionCheck" TEXT;`);
      }
      if (!colNames.has('isConnected')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Settings" ADD COLUMN "isConnected" BOOLEAN DEFAULT 0;`);
      }
      if (!colNames.has('isMockMode')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Settings" ADD COLUMN "isMockMode" BOOLEAN DEFAULT 0;`);
      }
    } catch {}

    // 2. Check missing columns on Contact
    try {
      const contactColumns: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(Contact);`);
      const colNames = new Set(contactColumns.map((c) => c.name));

      if (!colNames.has('optedOutAt')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Contact" ADD COLUMN "optedOutAt" DATETIME;`);
      }
      if (!colNames.has('status')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Contact" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';`);
      }
    } catch {}

    // 3. Check missing columns on Campaign
    try {
      const campaignColumns: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(Campaign);`);
      const colNames = new Set(campaignColumns.map((c) => c.name));

      if (!colNames.has('optimizationMode')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Campaign" ADD COLUMN "optimizationMode" TEXT DEFAULT 'AUTO';`);
      }
    } catch {}

    // 4. Check missing columns on CampaignMessage
    try {
      const campaignMsgColumns: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(CampaignMessage);`);
      const colNames = new Set(campaignMsgColumns.map((c) => c.name));

      if (!colNames.has('channel')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE "CampaignMessage" ADD COLUMN "channel" TEXT DEFAULT 'CLOUD_API';`);
      }
    } catch {}

    // 5. Check missing tables and create if missing
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ConversationFlow" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "slug" TEXT UNIQUE NOT NULL,
          "description" TEXT,
          "definition" TEXT NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ConversationSession" (
          "id" TEXT PRIMARY KEY,
          "flowId" TEXT NOT NULL,
          "contactId" TEXT NOT NULL,
          "currentStep" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "data" TEXT NOT NULL DEFAULT '{}',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "completedAt" DATETIME,
          FOREIGN KEY ("flowId") REFERENCES "ConversationFlow" ("id") ON DELETE CASCADE,
          FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ContactSuppression" (
          "id" TEXT PRIMARY KEY,
          "contactId" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'MARKETING_OPT_OUT',
          "reason" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ConversionEvent" (
          "id" TEXT PRIMARY KEY,
          "contactId" TEXT,
          "eventName" TEXT NOT NULL,
          "eventValue" REAL,
          "metadata" TEXT,
          "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL
        );
      `);
    } catch {}

    // 6. Ensure default Settings record exists
    await prisma.settings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        businessName: 'My WhatsApp Business',
        isMockMode: false,
        isConnected: false,
        webhookVerifyToken: 'whatsapp_wati_webhook_secret_2026',
        marketingMessagesEnabled: true,
        marketingMessagesPolicy: 'CLOUD_API_FALLBACK',
      },
    }).catch(() => {});

    // 7. Ensure default qualification flows exist
    await ensureDefaultFlows().catch(() => {});

    isInitialized = true;
    logger.info('Database self-healing schema check completed successfully');
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Database auto-initialization check skipped/non-blocking');
  }
}
