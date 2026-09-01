# WAYAPP Enterprise — Master Project Handover & Operations Guide

Welcome to the **WAYAPP** project handover documentation. This guide is crafted for developers, DevOps engineers, systems administrators, and business stakeholders taking over the maintenance, operations, scaling, and feature evolution of the platform.

---

## Table of Contents
1. [System Architecture & Stack Overview](#1-system-architecture--stack-overview)
2. [Live Production Infrastructure & Configuration](#2-live-production-infrastructure--configuration)
3. [Quick Start & Local Developer Onboarding](#3-quick-start--local-developer-onboarding)
4. [Database Operations, Migrations & Disaster Recovery](#4-database-operations-migrations--disaster-recovery)
5. [WhatsApp Meta Cloud API Integration & Webhooks](#5-whatsapp-meta-cloud-api-integration--webhooks)
6. [Background Worker & Message Dispatcher](#6-background-worker--message-dispatcher)
7. [AI Co-Pilot, Knowledge Base & Flow Builder](#7-ai-co-pilot-knowledge-base--flow-builder)
8. [Public REST API v1 & Customer Outbound Webhooks](#8-public-rest-api-v1--customer-outbound-webhooks)
9. [Security, Auth & Environment Variables](#9-security-auth--environment-variables)
10. [Troubleshooting & Common Meta Error Codes](#10-troubleshooting--common-meta-error-codes)
11. [Repository Structure & Key File Map](#11-repository-structure--key-file-map)

---

## 1. System Architecture & Stack Overview

WAYAPP is an enterprise-grade, self-hosted WhatsApp Marketing, Automation, and Team Inbox platform built with zero monthly SaaS markups.

```mermaid
graph TD
    Client[Web Browser / PWA / Mobile] -->|HTTPS| NextApp[Next.js 15 App Router]
    NextApp -->|Prisma ORM| Postgres[(PostgreSQL 18 Database)]
    Worker[WAYAPP Background Worker] -->|Prisma ORM| Postgres
    Worker -->|Meta Graph API v21.0| Meta[Meta WhatsApp Cloud API]
    Meta -->|Webhook Receipts| NextApp
    Worker -->|Scheduled Backups| R2[Cloudflare R2 Bucket: wayapp-backups]
```

### Core Technologies
- **Frontend / Fullstack:** [Next.js 15](https://nextjs.org/) (App Router, React 19, Server Actions, Route Handlers)
- **Styling & UI:** Tailwind CSS v4, Lucide React icons, `@xyflow/react` (Visual Flow Canvas)
- **Database & ORM:** PostgreSQL 18 with [Prisma ORM v6](https://www.prisma.io/)
- **Authentication:** JWT Sessions (`jose`) stored in HTTP-only secure cookies + SHA-256 API Keys
- **Background Worker:** Standalone Node.js process (`src/worker/index.ts`) with Token-Bucket Rate Limiter & Self-Healing Sweeper
- **Real-Time Stream:** Server-Sent Events (SSE) `/api/chat/stream` + Fallback Polling (2.5s)
- **PaaS & Orchestration:** [Dokploy](https://dokploy.com/) with Docker Multi-Stage Builds & Zero-Downtime Health Probes
- **Object Storage & Backups:** Cloudflare R2 (S3-compatible) with automated twice-daily snapshots

---

## 2. Live Production Infrastructure & Configuration

### Production Environments
| Service | Host / Endpoint | Role / Identifier |
|---|---|---|
| **Dokploy PaaS** | `https://paas.usmankhan.xyz` | PaaS Management Dashboard |
| **Production App** | `GCC` (ID: `qiMI5nI31j_vcOZAHyxHB`) | Live Next.js Web + Worker Container |
| **Postgres Database** | `wayapp-db` (ID: `Qf9aBJSJwfOm-sT-ZaCiu`) | PostgreSQL 18 Production Cluster |
| **Dedicated Backup Storage** | Cloudflare R2 (`wayapp-backups`) | Destination ID: `jOrSRHq_5B19N01gXcIh1` |
| **Backup Schedule** | `0 */12 * * *` (Twice-Daily) | Dokploy Backup ID: `vapjFQFMg16LYxWbepCfi` |

> [!IMPORTANT]
> **R2 Bucket Isolation Directive:**  
> WAYAPP backups are strictly assigned to `wayapp-backups`. NEVER attach WAYAPP database dumps to `gccstarup-cms` or shared buckets.

---

## 3. Quick Start & Local Developer Onboarding

### Prerequisites
- Node.js 20.x or 22.x LTS
- PostgreSQL 16+ (or Docker)
- Git

### 3-Minute Setup
```bash
# 1. Clone the repository
git clone https://github.com/usmankhan4001/WAYAPP.git
cd WAYAPP

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and supply DATABASE_URL and AUTH_SECRET

# 4. Generate Prisma client & apply migrations
npx prisma generate
npx prisma db push

# 5. Optional: Seed initial test user & sample data
npx tsx prisma/seed.ts

# 6. Start development server & worker
npm run dev
# In a separate terminal:
npm run worker:dev
```

### Verification Commands
```bash
# Typecheck
npx tsc --noEmit

# Run unit & integration tests
npm test

# Verify production build
npm run build
```

---

## 4. Database Operations, Migrations & Disaster Recovery

### Database Resilience Design
The production container uses [`docker-entrypoint.sh`](file:///D:/GCC%20Startup/Whatsapp%20WATI%20clone/docker-entrypoint.sh) which includes:
1. **30-Second Readiness Retry Loop:** Prevents container boot crashes if PostgreSQL is starting up.
2. **Safe Schema Synchronizer:** Runs `prisma db push --skip-generate` without dropping data.
3. **Dynamic Standalone Prisma Client Sync:** Automatically mirrors the compiled `.prisma` client to Next.js standalone paths.

### Manual Backup to Cloudflare R2
```bash
# Export and push a timestamped backup directly to R2
./scripts/backup-to-r2.sh
```

### Restoring from Backup
```bash
# 1. Download the snapshot from R2 or local directory
./scripts/restore-from-r2.sh wayapp-backups/wayapp_backup_20260824_120000.sql.gz
```

---

## 5. WhatsApp Meta Cloud API Integration & Webhooks

### 1. Meta Developer App Setup
1. Go to [Meta for Developers](https://developers.facebook.com/) and open your WhatsApp Business App.
2. Navigate to **WhatsApp > API Setup** to find:
   - **Phone Number ID** (`META_PHONE_NUMBER_ID`)
   - **WhatsApp Business Account ID (WABA)** (`META_WABA_ID`)
   - **System User Permanent Access Token** (`META_API_TOKEN`)

### 2. Configuring Webhooks in Meta
- **Callback URL:** `https://your-domain.com/api/webhooks/whatsapp`
- **Verify Token:** Set to the value of `META_WEBHOOK_VERIFY_TOKEN` in your `.env`
- **Webhook Fields to Subscribe:** `messages`, `message_template_status_update`, `message_deliveries`

### 3. Service Window Compliance Guard
Meta imposes a strict **24-hour customer care window**.
- When a customer sends an inbound message, the 24h timer starts.
- Within 24h: Free-form text, voice notes, media, and interactive buttons can be sent.
- Beyond 24h: Free-form messages are automatically blocked by the UI and API. You **must** send an approved **WhatsApp Template** to re-open the 24-hour window.

---

## 6. Background Worker & Message Dispatcher

The background worker (`src/worker/index.ts`) runs independently from web request handlers:

### Responsibilities
1. **Campaign Scheduler (every 15s):** Pulls campaigns in `SCHEDULED` or `PROCESSING` state.
2. **Token-Bucket Rate Limiter:** Respects Meta API account rate limits (default: 20 to 80 messages/second).
3. **Self-Healing Sweeper (every 60s):** Detects stranded broadcast campaigns if a server unexpectedly restarted.
4. **Outbound Webhook Delivery (every 5s):** Pushes real-time events to customer-configured endpoints with HMAC-SHA256 signatures.
5. **Worker Health Endpoint (port 3001):** Answers `/health` for Docker / Dokploy container probes.
6. **Memory Guard:** Emits automatic warnings if heap memory exceeds 400MB.

---

## 7. AI Co-Pilot, Knowledge Base & Flow Builder

### Multi-Provider AI Engine
Supported providers in `src/lib/ai/` and `src/app/api/chat/ai-copilot/route.ts`:
- **Google Gemini 2.5** (`GEMINI_API_KEY`)
- **OpenAI GPT-4o / Mini** (`OPENAI_API_KEY`)
- **Anthropic Claude 3.5 Sonnet** (`ANTHROPIC_API_KEY`)
- **OpenRouter / Meta Llama 3.3** (`OPENROUTER_API_KEY`)

### Visual Flow Builder
- Built with `@xyflow/react` in `src/app/flows/[id]/page.tsx`.
- Nodes: `Trigger`, `Send Message`, `Buttons / List`, `Condition Branching`, `Assign Tag / Group`, and `Transfer to Agent`.
- Includes an in-browser **Interactive Simulator** allowing testing before publishing.

---

## 8. Public REST API v1 & Customer Outbound Webhooks

### API Key Authentication
All requests to `/api/v1/*` require an API Key passed in headers:
```http
X-API-Key: way_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Key API Endpoints
- `POST /api/v1/messages` — Send text, media, or approved template messages.
- `GET /api/v1/contacts` — Paginated contact search and filtering.
- `POST /api/v1/campaigns` — Create and trigger broadcast campaigns programmatically.
- `GET /api/v1/analytics` — Real-time delivery and response funnel metrics.
- `GET /api/v1/docs` — Interactive Swagger UI documentation.
- `GET /openapi.json` — Complete OpenAPI 3.0 specification.

---

## 9. Security, Auth & Environment Variables

### Security Checklist
- [x] **Zero Inline Styles:** Compliant with Tailwind CSS design system.
- [x] **Edge-Safe JWT Auth:** Authenticated via `AUTH_SECRET` (minimum 32-byte cryptographic key).
- [x] **Webhook Signature Verification:** Inbound Meta payloads verified with `X-Hub-Signature-256`.
- [x] **Rate-Limiting:** Middleware protects authentication and broadcast endpoints against brute-force attacks.
- [x] **Role-Based Access Control (RBAC):** Strict separation between `SUPER_ADMIN`, `ADMIN`, and `AGENT`.

### Environment Variables Template
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/wayapp?schema=public"

# Auth & Secrets
AUTH_SECRET="generate_with_openssl_rand_base64_48"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Meta Cloud API
META_API_VERSION="v21.0"
META_PHONE_NUMBER_ID=""
META_WABA_ID=""
META_API_TOKEN=""
META_WEBHOOK_VERIFY_TOKEN=""
META_APP_SECRET=""

# AI Providers (Optional / As needed)
GEMINI_API_KEY=""
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
OPENROUTER_API_KEY=""

# Cloudflare R2 Backups
S3_BACKUP_ENABLED=true
S3_ENDPOINT="https://<your-account-id>.r2.cloudflarestorage.com"
S3_ACCESS_KEY="your_r2_access_key"
S3_SECRET_KEY="your_r2_secret_key"
S3_BUCKET_NAME="wayapp-backups"
```

---

## 10. Troubleshooting & Common Meta Error Codes

| Error Code | Meaning | Remediation / System Action |
|---|---|---|
| **131026** | Message Undeliverable | Contact does not have WhatsApp or number is invalid. Handled gracefully. |
| **131047** | 24h Window Expired | Send an approved WhatsApp template to re-engage the customer. |
| **130472** | User Opt-Out / Spam Block | Contact opted out. WAYAPP automatically sets `optIn: false`. |
| **131056** | Rate Limit Exceeded | Worker automatically throttles and retries with exponential backoff. |
| **132000** | Template Parameter Count Mismatch | Verify dynamic variable placeholders (`{{1}}`, `{{2}}`) match template definition. |

---

## 11. Repository Structure & Key File Map

```
WAYAPP/
├── .github/                      # CI/CD Workflows & assets
├── docs/                         # Architecture, guides, and wiki pages
│   ├── DEPLOYMENT_GUIDE.md       # Dokploy deployment steps
│   ├── ERD.md                    # Database entity-relationship diagram
│   ├── GETTING_STARTED.md        # User onboarding guide
│   ├── SESSION_PROGRESS_REPORT.md# Complete deployment log
│   └── wiki/                     # 15-page GitHub enterprise wiki
├── prisma/
│   ├── schema.prisma             # Primary database schema
│   ├── migrations/               # Baseline migrations
│   └── seed.ts                   # Initial seed script
├── public/                       # PWA icons, manifest.json, sw.js
├── scripts/                      # Backup, R2 sync, and project seeder scripts
├── src/
│   ├── app/                      # Next.js App Router (Pages & API routes)
│   ├── components/               # React UI components (Inbox, Flow Builder, CRM)
│   ├── lib/                      # Core libraries (Auth, Meta client, DB, Push)
│   └── worker/                   # Standalone background worker & dispatcher
├── Dockerfile                    # Multi-stage production container definition
├── docker-compose.yml            # Local & production Docker Compose orchestrator
├── docker-entrypoint.sh          # Container readiness loop & Prisma runtime sync
├── HANDOVER.md                   # This master handover document
└── README.md                     # Project overview & badges
```

---

**Handover Approved By:** AI Engineering Team  
**Repository Main Branch:** `main`  
**License:** MIT License
