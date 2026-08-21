#!/usr/bin/env bash
# WAYAPP Enterprise — Master GitHub Project Seeder Script (Bash)
# Automatically creates Milestones, Labels, and 20 Full Detailed Issues in your GitHub Repository

REPO="${1:-usmankhan4001/WAYAPP}"
TOKEN="${2:-$GITHUB_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "=========================================================================="
  echo "Please provide a GitHub Personal Access Token as the second argument."
  echo "Usage: ./scripts/seed-github-project-full.sh usmankhan4001/WAYAPP ghp_yourTokenHere"
  echo "=========================================================================="
  exit 1
fi

echo "🚀 Connecting to GitHub Repository: $REPO"

# 1. Milestones
create_milestone() {
  local title="$1"
  local desc="$2"
  curl -s -X POST "https://api.github.com/repos/$REPO/milestones" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -d "{\"title\":\"$title\",\"description\":\"$desc\",\"state\":\"open\"}" > /dev/null
  echo "  ✅ Processed Milestone: $title"
}

echo ""
echo "📌 Step 1: Creating Milestones..."
create_milestone "v1.0.0-core" "Meta Cloud API v21.0 Direct Engine, Webhooks, and Security Foundation"
create_milestone "v1.0.0-switchboard" "Plug-and-Play App Module Switchboard and Dynamic Adaptive Navigation"
create_milestone "v1.1.0-sales-suite" "AI Sales Co-Pilot, Canned Snippets (/), and In-Chat Lead CRM"
create_milestone "v1.1.0-crm-campaigns" "Visual Sales Pipeline Kanban Board and 3-Step Broadcast Wizard"
create_milestone "v1.2.0-omnichannel" "Omnichannel Instagram/Messenger Social Webhooks and WhatsApp Flows 3.0"
create_milestone "v1.3.0-integrations" "Shopify/WooCommerce Connectors and Meta Conversions API (CAPI)"
create_milestone "v1.3.0-devops" "GitHub CI/CD Pipelines, Dependabot, and CodeQL Security Analysis"

# 2. Labels
create_label() {
  local name="$1"
  local color="$2"
  local desc="$3"
  curl -s -X POST "https://api.github.com/repos/$REPO/labels" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -d "{\"name\":\"$name\",\"color\":\"$color\",\"description\":\"$desc\"}" > /dev/null
  echo "  ✅ Processed Label: $name"
}

echo ""
echo "🏷️ Step 2: Creating Labels..."
create_label "meta:api-v21" "0084FF" "Meta WhatsApp Business Platform v21.0 compliance"
create_label "module:sales-ai" "9333EA" "AI Sales Co-Pilot & Smart Reply features"
create_label "module:sales-tools" "F59E0B" "Canned snippets, payment links, booking links"
create_label "module:lead-crm" "3B82F6" "Visual sales pipeline, deal stages, and notes"
create_label "module:campaigns" "10B981" "Bulk broadcast engine and rate calculator"
create_label "module:flows" "6366F1" "Visual flow builder and bot engine"
create_label "module:ecommerce" "EC4899" "Shopify and WooCommerce connectors"
create_label "module:multichannel" "06B6D4" "Instagram Direct and Messenger webhooks"
create_label "type:feature" "10B981" "New feature or capability request"
create_label "type:bug" "EF4444" "Something isn't working as expected"
create_label "security" "B91C1C" "Security hardening and cryptography"
create_label "ci/cd" "64748B" "GitHub Actions, Docker, and deployment workflows"

# 3. Create Sample Issues
create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  curl -s -X POST "https://api.github.com/repos/$REPO/issues" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -d "{\"title\":\"$title\",\"body\":\"$body\",\"labels\":$labels}" > /dev/null
  echo "  ✅ Created Issue: $title"
  sleep 0.3
}

echo ""
echo "📋 Step 3: Creating Master Tasks & Issues..."
create_issue "[CORE] Direct Meta Cloud API v21.0 Client & Dual-Channel Router" "Direct Meta Graph API client with pre-flight sanitization, strict E.164 normalization, character clipping for list/button headers, and 0% markup direct dispatch." '["meta:api-v21","type:feature"]'
create_issue "[SECURITY] Fail-Closed Webhook Ingestion & Cryptographic HMAC Verification" "Constant-time HMAC-SHA256 verification, WAMID deduplication, and sub-100ms 200 OK acknowledgment." '["meta:api-v21","security"]'
create_issue "[RESILIENCE] Status Progression Lifecycle Guard & Out-of-Order Protection" "Rank-based status progression (PENDING -> SENT -> DELIVERED -> READ -> REPLIED/FAILED) preventing status regression." '["meta:api-v21","security"]'
create_issue "[RESILIENCE] Self-Healing Meta Error Handler (130472, 131026, 131047, 130429)" "Auto-suppression on opt-outs (130472), bounce tracking for invalid numbers (131026), and exponential backoff with jitter for rate limits (130429)." '["meta:api-v21","type:bug"]'
create_issue "[COMPLIANCE] Strict 24-Hour WhatsApp Service Window Guard & Template Recovery" "Live in-chat countdown timer and auto-blocking of free-form text with 1-click template re-engagement picker when window expires." '["meta:api-v21","type:feature"]'
create_issue "[PLATFORM] In-Memory Cached App Module Switchboard Engine (src/lib/modules.ts)" "10 extension modules toggleable in 1-click with sub-millisecond in-memory TTL caching and instant cache invalidation." '["type:feature"]'
create_issue "[UI/UX] Dynamic Adaptive Sidebar Navigation & Settings Marketplace Tab" "Sidebar navigation dynamically filters inactive module tabs; /settings Marketplace tab with visual cards and category pills." '["type:feature"]'
create_issue "[SALES-AI] AI Sales Co-Pilot API & Toolbar (Suggest, Polish, Translate, Summarize)" "Multi-LLM endpoint (/api/chat/ai-copilot) supporting 2-pill smart reply suggestions, tone polish, multi-language translation, and 3-bullet chat summaries." '["module:sales-ai","type:feature"]'
create_issue "[SALES-TOOLS] Canned Snippets (/shortcuts) & 1-Click Action Bar" "Popup autocomplete in live chat on typing /, dedicated Snippets Manager in Settings, and 1-click action bar for Invoices, Catalogs, and Calendly." '["module:sales-tools","type:feature"]'
create_issue "[SALES-CRM] In-Chat Lead CRM Panel & Private Team Sticky Notes" "Side panel with Deal Stage selector, deal value inline editor, yellow sticky internal team notes tab, and audit timeline." '["module:lead-crm","type:feature"]'
create_issue "[SALES-CRM] Visual Sales Pipeline Kanban Board (/contacts)" "Dual view mode (Table View & Kanban Board) with 6 stage columns (New Lead -> Won), and live revenue forecast ribbon." '["module:lead-crm","type:feature"]'
create_issue "[CAMPAIGNS] 3-Step Broadcast Wizard with 0% Markup Meta Cost Calculator" "Audience filter, live WhatsApp phone mockup with dynamic variable replacement, and official Meta conversation rate calculator in USD." '["module:campaigns","type:feature"]'
create_issue "[CHANNELS] Multi-Channel Direct Social Ingestor (Instagram DMs & Messenger)" "Direct Meta Graph API webhook endpoint (/api/webhooks/meta-social) for unified team inbox routing without third-party proxies." '["module:multichannel","type:feature"]'
create_issue "[FLOWS] Native Meta WhatsApp Flows 3.0 In-Chat Forms Engine" "Direct data-exchange endpoint (/api/webhooks/flows) for native in-chat interactive forms, lead qualification, and appointment booking." '["module:flows","meta:api-v21"]'
create_issue "[AUTOMATION] 1-Click Pre-Built Industry Bot Recipes" "5 pre-built automation templates for Real Estate, E-Commerce, Automotive, Clinics, and B2B Lead Gen." '["module:flows","type:feature"]'
create_issue "[ECOMMERCE] Shopify Direct Webhook Connector with Auto-Notifications" "Ingests orders/create, orders/fulfilled, and abandoned checkouts -> triggers instant WhatsApp confirmations and recovery discount reminders." '["module:ecommerce","type:feature"]'
create_issue "[ECOMMERCE] WooCommerce Direct Webhook Connector" "Ingests WooCommerce store orders, creates customer CRM records with deal values, and sends WhatsApp confirmations." '["module:ecommerce","type:feature"]'
create_issue "[ATTRIBUTION] Meta Conversions API (CAPI) Direct Event Dispatcher" "Server-to-server conversion dispatcher sending Lead, QualifiedLead, Purchase, and InitiateCheckout straight to Meta Graph API." '["meta:api-v21","type:feature"]'
create_issue "[CI/CD] GitHub Actions Workflows, Dependabot & CodeQL Security" "Matrix CI on Node 20 & 22, Docker multi-arch GHCR publishing, CodeQL static analysis, and issue/PR templates." '["ci/cd","security"]'
create_issue "[TESTING] Comprehensive Vitest Unit & Integration Test Suite" "35/35 automated unit and integration tests passing across 13 test files with 100% success rate." '["ci/cd","type:feature"]'

echo ""
echo "🎉 Master GitHub Project Board & Task Seeding Complete!"
echo "Check your issues at: https://github.com/$REPO/issues"
echo "Check your milestones at: https://github.com/$REPO/milestones"
