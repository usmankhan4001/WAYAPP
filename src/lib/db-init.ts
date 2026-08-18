import { prisma } from './prisma';

let isInitialized = false;

export async function ensureDatabaseSchema(): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Settings Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Settings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "wabaId" TEXT,
        "phoneNumberId" TEXT,
        "accessToken" TEXT,
        "webhookVerifyToken" TEXT DEFAULT 'whatsapp_wati_webhook_secret_2026',
        "appSecret" TEXT,
        "businessName" TEXT DEFAULT 'My WhatsApp Business',
        "businessPhone" TEXT DEFAULT '',
        "defaultCountryCode" TEXT DEFAULT '+1',
        "rateLimitPerSecond" INTEGER NOT NULL DEFAULT 20,
        "tierDailyLimit" INTEGER NOT NULL DEFAULT 1000,
        "qualityRating" TEXT DEFAULT 'GREEN',
        "isMockMode" BOOLEAN NOT NULL DEFAULT false,
        "isConnected" BOOLEAN NOT NULL DEFAULT false,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. User Table (Authentication)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT,
        "avatarUrl" TEXT,
        "metaUserId" TEXT UNIQUE,
        "role" TEXT NOT NULL DEFAULT 'MEMBER',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastLoginAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. AuthConfig Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuthConfig" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "metaAppId" TEXT,
        "metaAppSecret" TEXT,
        "allowedDomains" TEXT NOT NULL DEFAULT 'gccstartup.com,wayapp.io',
        "allowedEmails" TEXT NOT NULL DEFAULT 'usmankhan4001@gmail.com,admin@gccstartup.com',
        "requireAuth" BOOLEAN NOT NULL DEFAULT true,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Contact Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Contact" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "phoneNumber" TEXT NOT NULL UNIQUE,
        "firstName" TEXT,
        "lastName" TEXT,
        "email" TEXT,
        "customAttributes" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "lastInteractionAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. ContactGroup Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContactGroup" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "color" TEXT NOT NULL DEFAULT '#25D366',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. ContactsOnGroups Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContactsOnGroups" (
        "contactId" TEXT NOT NULL,
        "groupId" TEXT NOT NULL,
        "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("contactId", "groupId"),
        FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("groupId") REFERENCES "ContactGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 7. Tag Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Tag" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "color" TEXT NOT NULL DEFAULT '#3B82F6',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. ContactsOnTags Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContactsOnTags" (
        "contactId" TEXT NOT NULL,
        "tagId" TEXT NOT NULL,
        "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("contactId", "tagId"),
        FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 9. Segment Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Segment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "rulesJson" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Template Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Template" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "metaId" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "language" TEXT NOT NULL DEFAULT 'en_US',
        "category" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "qualityScore" TEXT DEFAULT 'GREEN',
        "rejectedReason" TEXT,
        "components" TEXT NOT NULL,
        "rawJson" TEXT,
        "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Campaign Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Campaign" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "templateId" TEXT NOT NULL,
        "audienceFilter" TEXT NOT NULL,
        "variableMappings" TEXT NOT NULL,
        "headerMediaUrl" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "totalContacts" INTEGER NOT NULL DEFAULT 0,
        "sentCount" INTEGER NOT NULL DEFAULT 0,
        "deliveredCount" INTEGER NOT NULL DEFAULT 0,
        "readCount" INTEGER NOT NULL DEFAULT 0,
        "repliedCount" INTEGER NOT NULL DEFAULT 0,
        "failedCount" INTEGER NOT NULL DEFAULT 0,
        "scheduledAt" DATETIME,
        "startedAt" DATETIME,
        "completedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    // 12. CampaignMessage Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CampaignMessage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "campaignId" TEXT NOT NULL,
        "contactId" TEXT,
        "phoneNumber" TEXT NOT NULL,
        "wamid" TEXT UNIQUE,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "sentAt" DATETIME,
        "deliveredAt" DATETIME,
        "readAt" DATETIME,
        "repliedAt" DATETIME,
        "failedAt" DATETIME,
        "errorCode" TEXT,
        "errorMessage" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // 13. ChatMessage Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChatMessage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "contactId" TEXT NOT NULL,
        "phoneNumber" TEXT NOT NULL,
        "direction" TEXT NOT NULL,
        "wamid" TEXT UNIQUE,
        "messageType" TEXT NOT NULL,
        "body" TEXT,
        "mediaUrl" TEXT,
        "status" TEXT NOT NULL DEFAULT 'SENT',
        "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 14. Automation Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Automation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "triggerType" TEXT NOT NULL,
        "triggerConfig" TEXT NOT NULL,
        "actionsJson" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "executionCount" INTEGER NOT NULL DEFAULT 0,
        "lastTriggeredAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. AutomationLog Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AutomationLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "automationId" TEXT NOT NULL,
        "contactId" TEXT,
        "phoneNumber" TEXT NOT NULL,
        "triggerInput" TEXT,
        "actionTaken" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'SUCCESS',
        "errorMessage" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("automationId") REFERENCES "Automation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    isInitialized = true;
  } catch (error) {
    console.error('Database auto-initialization error:', error);
  }
}
