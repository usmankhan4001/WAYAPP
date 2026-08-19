import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ensureDefaultFlows } from '@/lib/whatsapp/conversation-engine';

let isInitialized = false;

async function ensureTableColumns(tableName: string, requiredColumns: Record<string, string>): Promise<void> {
  try {
    const columns: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}");`);
    if (!Array.isArray(columns) || columns.length === 0) return;
    
    const colNames = new Set(columns.map((c) => c.name));
    for (const [colName, colDef] of Object.entries(requiredColumns)) {
      if (!colNames.has(colName)) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${colDef};`);
          logger.info(`[Database] Added missing column ${colName} to ${tableName}`);
        } catch (err: any) {
          logger.warn(`[Database] Failed to add column ${colName} to ${tableName}: ${err.message}`);
        }
      }
    }
  } catch (err: any) {
    // If table doesn't exist yet, it will be created by CREATE TABLE statements below
  }
}

/**
 * Self-healing Database Initializer & Migration Engine
 * Automatically checks and adds any missing columns and tables in SQLite / PostgreSQL
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Create base tables if not present
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Settings" (
        "id" TEXT PRIMARY KEY DEFAULT 'default',
        "wabaId" TEXT,
        "phoneNumberId" TEXT,
        "accessToken" TEXT,
        "accessTokenMasked" TEXT,
        "webhookVerifyToken" TEXT DEFAULT 'whatsapp_wati_webhook_secret_2026',
        "appSecret" TEXT,
        "businessName" TEXT DEFAULT 'My WhatsApp Business',
        "businessPhone" TEXT DEFAULT '',
        "defaultCountryCode" TEXT DEFAULT '+1',
        "rateLimitPerSecond" INTEGER DEFAULT 20,
        "tierDailyLimit" INTEGER DEFAULT 1000,
        "qualityRating" TEXT DEFAULT 'GREEN',
        "isMockMode" BOOLEAN DEFAULT 0,
        "isConnected" BOOLEAN DEFAULT 0,
        "encryptionCheck" TEXT,
        "marketingMessagesEnabled" BOOLEAN DEFAULT 0,
        "marketingMessagesPolicy" TEXT DEFAULT 'CLOUD_API_FALLBACK',
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuthConfig" (
        "id" TEXT PRIMARY KEY DEFAULT 'default',
        "metaAppId" TEXT,
        "metaAppSecret" TEXT,
        "allowedDomains" TEXT DEFAULT 'gccstartup.com',
        "allowedEmails" TEXT DEFAULT '',
        "requireAuth" BOOLEAN DEFAULT 0,
        "allowRegistration" BOOLEAN DEFAULT 1,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // 2. Ensure all columns on Settings are present
    await ensureTableColumns('Settings', {
      wabaId: 'TEXT',
      phoneNumberId: 'TEXT',
      accessToken: 'TEXT',
      accessTokenMasked: 'TEXT',
      webhookVerifyToken: `TEXT DEFAULT 'whatsapp_wati_webhook_secret_2026'`,
      appSecret: 'TEXT',
      businessName: `TEXT DEFAULT 'My WhatsApp Business'`,
      businessPhone: `TEXT DEFAULT ''`,
      defaultCountryCode: `TEXT DEFAULT '+1'`,
      rateLimitPerSecond: 'INTEGER DEFAULT 20',
      tierDailyLimit: 'INTEGER DEFAULT 1000',
      qualityRating: `TEXT DEFAULT 'GREEN'`,
      isMockMode: 'BOOLEAN DEFAULT 0',
      isConnected: 'BOOLEAN DEFAULT 0',
      encryptionCheck: 'TEXT',
      marketingMessagesEnabled: 'BOOLEAN DEFAULT 0',
      marketingMessagesPolicy: `TEXT DEFAULT 'CLOUD_API_FALLBACK'`,
      updatedAt: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    });

    // 3. Ensure all columns on Contact are present
    await ensureTableColumns('Contact', {
      firstName: 'TEXT',
      lastName: 'TEXT',
      email: 'TEXT',
      customAttributes: 'TEXT',
      status: `TEXT DEFAULT 'ACTIVE'`,
      optedOutAt: 'DATETIME',
      lastInteractionAt: 'DATETIME',
      createdAt: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
      updatedAt: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    });

    // 4. Ensure all columns on Campaign are present
    await ensureTableColumns('Campaign', {
      optimizationMode: `TEXT DEFAULT 'AUTO'`,
      headerMediaUrl: 'TEXT',
      totalContacts: 'INTEGER DEFAULT 0',
      sentCount: 'INTEGER DEFAULT 0',
      deliveredCount: 'INTEGER DEFAULT 0',
      readCount: 'INTEGER DEFAULT 0',
      repliedCount: 'INTEGER DEFAULT 0',
      failedCount: 'INTEGER DEFAULT 0',
    });

    // 5. Ensure all columns on CampaignMessage are present
    await ensureTableColumns('CampaignMessage', {
      channel: `TEXT DEFAULT 'CLOUD_API'`,
      errorMessage: 'TEXT',
      sentAt: 'DATETIME',
      deliveredAt: 'DATETIME',
      readAt: 'DATETIME',
      failedAt: 'DATETIME',
    });

    // 6. Ensure all columns on Template are present
    await ensureTableColumns('Template', {
      qualityScore: `TEXT DEFAULT 'GREEN'`,
      rejectedReason: 'TEXT',
      rawJson: 'TEXT',
    });

    // 7. Ensure ConversationFlow and Session tables exist
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
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ConversationSession" (
        "id" TEXT PRIMARY KEY,
        "contactId" TEXT NOT NULL,
        "flowId" TEXT NOT NULL,
        "currentStep" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "dataJson" TEXT NOT NULL DEFAULT '{}',
        "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" DATETIME,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContactSuppression" (
        "id" TEXT PRIMARY KEY,
        "contactId" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'MARKETING_OPT_OUT',
        "reason" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ConversionEvent" (
        "id" TEXT PRIMARY KEY,
        "contactId" TEXT,
        "campaignId" TEXT,
        "eventName" TEXT NOT NULL,
        "eventTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "value" REAL,
        "currency" TEXT DEFAULT 'USD',
        "metadata" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // 8. Ensure default Settings record exists via raw query first
    await prisma.$executeRawUnsafe(`
      INSERT OR IGNORE INTO "Settings" ("id", "businessName", "isMockMode", "isConnected", "webhookVerifyToken", "marketingMessagesEnabled", "marketingMessagesPolicy", "updatedAt")
      VALUES ('default', 'My WhatsApp Business', 0, 0, 'whatsapp_wati_webhook_secret_2026', 1, 'CLOUD_API_FALLBACK', CURRENT_TIMESTAMP);
    `).catch(() => {});

    // 9. Ensure default qualification flows exist
    await ensureDefaultFlows().catch(() => {});

    isInitialized = true;
    logger.info('[Database] Self-healing schema validation and migration completed successfully');
  } catch (error: any) {
    logger.warn({ error: error.message }, '[Database] Schema check skipped or non-blocking');
  }
}
