import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: 'SALES_AI' | 'SALES_TOOLS' | 'ENGAGEMENT' | 'AUTOMATION' | 'CHANNELS' | 'INTEGRATIONS' | 'DEVELOPER';
  icon: string;
  defaultEnabled: boolean;
  isCore?: boolean;
}

export const REGISTERED_MODULES: ModuleDefinition[] = [
  {
    id: 'ai_copilot',
    name: 'AI Sales Co-Pilot',
    description: 'In-chat 1-click AI reply suggestions, professional tone polishing, instant translation, and conversation history summarizer.',
    category: 'SALES_AI',
    icon: 'Sparkles',
    defaultEnabled: true,
  },
  {
    id: 'canned_snippets',
    name: 'Canned Snippets & Quick Actions',
    description: 'Type "/" for instant pre-saved sales messages (/pricing, /brochure), 1-click payment/invoice links, and booking links.',
    category: 'SALES_TOOLS',
    icon: 'Zap',
    defaultEnabled: true,
  },
  {
    id: 'lead_crm',
    name: 'In-Chat Visual Lead CRM',
    description: 'Visual deal stage pipeline (New Lead -> Qualified -> Won), deal value tracking, custom tags, and private team notes.',
    category: 'SALES_TOOLS',
    icon: 'UserCheck',
    defaultEnabled: true,
  },
  {
    id: 'campaigns',
    name: 'Bulk Broadcast Campaigns',
    description: '3-step campaign wizard, Excel/CSV importer with auto-mapping, dynamic template variable mapper, and local currency cost estimator.',
    category: 'ENGAGEMENT',
    icon: 'Send',
    defaultEnabled: true,
  },
  {
    id: 'flows',
    name: 'No-Code Flow Builder',
    description: 'Visual drag-and-drop conversational journeys with conditions, delays, branching, and interactive WhatsApp menus.',
    category: 'AUTOMATION',
    icon: 'GitBranch',
    defaultEnabled: true,
  },
  {
    id: 'ai_bots',
    name: 'AI & Knowledge-Base Bots',
    description: 'Autonomous multi-LLM FAQ bots (Gemini, OpenAI, Claude) with guided knowledge base extraction and HTTP bot webhooks.',
    category: 'AUTOMATION',
    icon: 'Bot',
    defaultEnabled: true,
  },
  {
    id: 'multichannel',
    name: 'Multi-Channel Social Inbox',
    description: 'Direct Meta Instagram Direct DMs & Facebook Messenger integration directly in the unified team inbox.',
    category: 'CHANNELS',
    icon: 'Share2',
    defaultEnabled: false,
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Connectors',
    description: 'Direct Shopify & WooCommerce webhooks for automated order confirmation, shipment tracking, and abandoned cart recovery.',
    category: 'INTEGRATIONS',
    icon: 'ShoppingBag',
    defaultEnabled: false,
  },
  {
    id: 'webhooks_api',
    name: 'Developer API & Outbound Webhooks',
    description: 'Scoped API Keys (X-API-Key), REST v1 API (/api/v1/*), Swagger UI docs, and HMAC-signed outbound webhooks with retry queue.',
    category: 'DEVELOPER',
    icon: 'Code2',
    defaultEnabled: true,
  },
  {
    id: 'whatsapp_flows',
    name: 'Native Meta WhatsApp Flows',
    description: 'Native encrypted in-chat forms, surveys, and multi-step interactive screens rendered inside WhatsApp.',
    category: 'ENGAGEMENT',
    icon: 'Layers',
    defaultEnabled: false,
  },
];

// In-memory module cache with short TTL (5 seconds)
interface ModuleCache {
  modules: Record<string, boolean>;
  timestamp: number;
}

let cachedState: ModuleCache | null = null;
const CACHE_TTL_MS = 5000;

export function invalidateModuleCache() {
  cachedState = null;
}

/**
 * Ensures all registered modules exist in the database with their defaults.
 */
export async function seedDefaultModules(): Promise<void> {
  try {
    for (const mod of REGISTERED_MODULES) {
      await prisma.appModule.upsert({
        where: { id: mod.id },
        update: {
          name: mod.name,
          description: mod.description,
          category: mod.category,
          icon: mod.icon,
        },
        create: {
          id: mod.id,
          name: mod.name,
          description: mod.description,
          category: mod.category,
          icon: mod.icon,
          isEnabled: mod.defaultEnabled,
          configJson: '{}',
        },
      });
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to seed default app modules');
  }
}

/**
 * Checks if a specific module is currently enabled.
 * Returns fallback boolean if database is inaccessible.
 */
export async function isModuleEnabled(moduleId: string): Promise<boolean> {
  const now = Date.now();
  if (cachedState && now - cachedState.timestamp < CACHE_TTL_MS) {
    if (moduleId in cachedState.modules) {
      return cachedState.modules[moduleId];
    }
  }

  try {
    const modules = await prisma.appModule.findMany();
    if (modules.length === 0) {
      await seedDefaultModules();
      const def = REGISTERED_MODULES.find((m) => m.id === moduleId);
      return def ? def.defaultEnabled : true;
    }

    const stateMap: Record<string, boolean> = {};
    for (const m of modules) {
      stateMap[m.id] = m.isEnabled;
    }

    cachedState = {
      modules: stateMap,
      timestamp: now,
    };

    if (moduleId in stateMap) {
      return stateMap[moduleId];
    }

    const def = REGISTERED_MODULES.find((m) => m.id === moduleId);
    return def ? def.defaultEnabled : true;
  } catch {
    const def = REGISTERED_MODULES.find((m) => m.id === moduleId);
    return def ? def.defaultEnabled : true;
  }
}

/**
 * Gets all app modules and their current enabled states.
 */
export async function getAllAppModules() {
  try {
    let rows = await prisma.appModule.findMany({
      orderBy: { id: 'asc' },
    });

    if (rows.length < REGISTERED_MODULES.length) {
      await seedDefaultModules();
      rows = await prisma.appModule.findMany({
        orderBy: { id: 'asc' },
      });
    }

    return rows.map((row) => {
      const def = REGISTERED_MODULES.find((m) => m.id === row.id);
      return {
        ...row,
        icon: def?.icon || row.icon || 'Zap',
        category: def?.category || row.category || 'ENGAGEMENT',
      };
    });
  } catch (error) {
    logger.error({ error }, 'Error retrieving app modules');
    return REGISTERED_MODULES.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      icon: m.icon,
      isEnabled: m.defaultEnabled,
      configJson: '{}',
      updatedAt: new Date(),
    }));
  }
}

/**
 * Toggles an app module ON or OFF.
 */
export async function setModuleEnabled(moduleId: string, isEnabled: boolean) {
  const result = await prisma.appModule.upsert({
    where: { id: moduleId },
    update: { isEnabled, updatedAt: new Date() },
    create: {
      id: moduleId,
      name: REGISTERED_MODULES.find((m) => m.id === moduleId)?.name || moduleId,
      description: REGISTERED_MODULES.find((m) => m.id === moduleId)?.description || '',
      category: REGISTERED_MODULES.find((m) => m.id === moduleId)?.category || 'ENGAGEMENT',
      icon: REGISTERED_MODULES.find((m) => m.id === moduleId)?.icon || 'Zap',
      isEnabled,
      configJson: '{}',
    },
  });

  invalidateModuleCache();
  return result;
}
