# 🏗️ Architecture & Direct Connector vs Middleware Proxies

This guide outlines the architectural design of WAYAPP Enterprise and explains why our **First-Party Direct Connector model** outperforms traditional intermediary SaaS proxies (such as OnCloudAPI, WATI, Twilio, or standard BSP wrappers).

---

## 🆚 Comparison: First-Party Direct vs Intermediary Proxy

| Dimension | ❌ Intermediary Proxy SaaS (e.g. OnCloudAPI) | 🚀 WAYAPP Enterprise (First-Party Direct) |
|---|---|---|
| **Network Hops** | Client $\rightarrow$ Intermediary Cloud $\rightarrow$ Meta Cloud $\rightarrow$ Recipient | **Client $\rightarrow$ Meta Cloud API $\rightarrow$ Recipient** (Direct 1-Hop) |
| **Message Latency** | 400ms – 1,200ms (Dependent on 3rd-party queue) | **< 80ms** (Direct Graph API dispatch) |
| **Pricing Markup** | +15% to +40% margin surcharge on Meta message costs | **0% Markup** (Pay Meta exact official conversation rates) |
| **Data Privacy & GDPR** | All customer PII stored on 3rd-party shared multi-tenant servers | **Complete Sovereignty** (Self-hosted or dedicated private cloud) |
| **Meta Feature Parity** | Delayed support for new Meta APIs (Flows, Catalogs, CAPI) | **Instant Native Access** to all Meta Graph API v21.0+ capabilities |
| **Vendor Lock-in** | High (Proprietary format, database export restrictions) | **Zero Lock-in** (Standard SQL schemas, exportable anytime) |

---

## 🧱 Layered Architecture Overview

```
+-----------------------------------------------------------------------+
|                       PRESENTATION & SALES WORKSPACE                  |
|  - Shared Live Chat Inbox       - Visual Sales Pipeline Kanban Board  |
|  - AI Sales Co-Pilot Toolbar    - 3-Step Campaign & Rate Wizard       |
|  - Canned Snippets (/)          - 1-Click Industry Bot Recipes        |
+-----------------------------------------------------------------------+
                                  │
                                  ▼
+-----------------------------------------------------------------------+
|                    MODULAR APP SWITCHBOARD LAYER                      |
|  - 10 Toggleable Extension Modules (In-memory cached TTL registry)    |
|  - Dynamic Route & Navigation Filtering Engine                        |
+-----------------------------------------------------------------------+
                                  │
                                  ▼
+-----------------------------------------------------------------------+
|                       DIRECT META CONNECTOR CORE                      |
|  - Meta Cloud API v21.0 Client  - Dual-Channel Fallback Router        |
|  - Cryptographic HMAC Verifier  - Status Progression Guard (1 to 99)  |
|  - 24-Hour Policy Window Guard  - Self-Healing Error Interceptor      |
+-----------------------------------------------------------------------+
                                  │
                                  ▼
+-----------------------------------------------------------------------+
|                      DATA & INFRASTRUCTURE LAYER                      |
|  - SQLite (Local Dev) / PostgreSQL (Production Cloud)                 |
|  - AES-256 GCM Credential Encryption & Strict RBAC Authentication     |
+-----------------------------------------------------------------------+
```

---

## ⚡ Direct Meta Graph API Endpoints Used

WAYAPP communicates directly with the following official Meta Graph endpoints:

1. **Messages Dispatch**:
   `POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`
   * Direct dispatch for Text, Audio, Images, Documents, Videos, Interactive Buttons, Lists, and Templates.
2. **Template Management**:
   `GET/POST https://graph.facebook.com/v21.0/{WABA_ID}/message_templates`
   * Fetch approved template metadata, components, positional variables, and languages.
3. **Phone & Business Registration (2FA)**:
   `POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/register`
   * 1-Click 6-digit PIN registration on Meta's WhatsApp gateway.
4. **Meta Conversions API (CAPI)**:
   `POST https://graph.facebook.com/v21.0/{PIXEL_ID}/events`
   * Server-to-server dispatch of Click-to-WhatsApp Ads lead conversions.
