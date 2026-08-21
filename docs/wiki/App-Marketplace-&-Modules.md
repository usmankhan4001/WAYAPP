# 🧩 App Marketplace & Modular Switchboard Guide

WAYAPP Enterprise is architected around a **Tier 1 (Core) + Tier 2 (Modular Plug-and-Play)** engine. This allows teams to turn features on or off with a single click in `/settings`, adapting the platform to their exact operational requirements without UI bloat.

---

## 📋 The 10 Registered Extension Modules

| Module ID | Module Name | Category | Default State | Description |
|---|---|---|---|---|
| `ai_copilot` | **AI Sales Co-Pilot** | `SALES_AI` | `Enabled` | Smart replies, tone polish, translation, and chat summaries |
| `canned_snippets` | **Canned Snippets & Quick Actions** | `SALES_TOOLS` | `Enabled` | `/shortcuts`, payment links, catalog links, meeting links |
| `lead_crm` | **Lead CRM & Pipeline Kanban** | `SALES_TOOLS` | `Enabled` | Deal stages, estimated values, private notes, and pipeline Kanban |
| `campaigns` | **Bulk Broadcast Campaigns** | `ENGAGEMENT` | `Enabled` | 3-step wizard, variable mapping, 0% markup cost calculator |
| `flow_builder` | **Visual Flow Builder & Bot Journeys** | `AUTOMATION` | `Enabled` | Stateful node graph editor, conditions, delay timers, and AI nodes |
| `autonomous_bots` | **Autonomous AI & Knowledge Base Bots**| `AUTOMATION` | `Enabled` | Multi-LLM RAG bots that answer customer queries automatically |
| `multichannel` | **Multi-Channel Social (IG & Messenger)**| `CHANNELS` | `Enabled` | Direct Instagram Direct DMs and Facebook Messenger ingestion |
| `ecommerce` | **Shopify & WooCommerce Connectors** | `INTEGRATIONS` | `Disabled` | Order confirmations, tracking updates, abandoned cart recovery |
| `webhooks_api` | **Outbound Webhooks & Developer API** | `DEVELOPER` | `Disabled` | Scoped API keys and HMAC cryptographic outbound delivery |
| `whatsapp_flows` | **Native Meta WhatsApp Flows 3.0** | `AUTOMATION` | `Enabled` | In-chat interactive forms, lead qualification, and booking screens |

---

## ⚡ How the Module Switchboard Works

### 1. In-Memory TTL Cache Engine (`src/lib/modules.ts`)
To prevent database lookup bottlenecks during high-throughput messaging, module statuses are cached in memory with a 5,000ms TTL:

```typescript
export async function isModuleEnabled(moduleId: string): Promise<boolean> {
  const now = Date.now();
  if (cachedState && now - lastCacheFetch < CACHE_TTL_MS) {
    return cachedState[moduleId] ?? defaultState;
  }
  // Refreshes cache from database...
}
```

### 2. Instant Cache Invalidation
When an administrator toggles a module in `/settings`, `invalidateModuleCache()` is executed immediately, propagating the change across all API routes, background workers, and sidebar navigators without requiring a server restart.

### 3. Dynamic Adaptive Navigation (`Sidebar.tsx`)
The application sidebar dynamically filters out inactive modules. For example, if your organization does not use Campaigns or E-Commerce, disabling those modules immediately removes those tabs from the sidebar, creating a focused, distraction-free inbox for your sales reps.
