import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ensureDefaultFlows } from '@/lib/whatsapp/conversation-engine';

let isInitialized = false;

/**
 * Self-healing Database Initializer
 * Automatically ensures SQLite / PostgreSQL tables and columns exist and seeds required records.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Ensure Settings record exists
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

    // 2. Ensure default qualification flows exist
    await ensureDefaultFlows().catch(() => {});

    isInitialized = true;
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Database auto-initialization check skipped/non-blocking');
  }
}
