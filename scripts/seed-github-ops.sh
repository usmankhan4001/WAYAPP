#!/usr/bin/env bash
# WAYAPP GitHub Operations Automation Script (Bash)
# Seeds Milestones, Labels, and Issue Categories via GitHub REST API v3

REPO="${1:-usmankhan4001/WAYAPP}"
TOKEN="${2:-$GITHUB_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "Usage: ./scripts/seed-github-ops.sh <owner/repo> <github_token>"
  echo "Example: ./scripts/seed-github-ops.sh usmankhan4001/WAYAPP ghp_yourTokenHere"
  exit 1
fi

echo "Connecting to GitHub Repository: $REPO"

# 1. Milestones
create_milestone() {
  local title="$1"
  local desc="$2"
  curl -s -X POST "https://api.github.com/repos/$REPO/milestones" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -d "{\"title\":\"$title\",\"description\":\"$desc\"}" > /dev/null
  echo "Processed Milestone: $title"
}

create_milestone "v1.0.0-core" "Essential Core Stack: Meta Cloud API v21.0 Direct Connector, Zero-Hop Webhooks."
create_milestone "v1.1.0-sales-suite" "Sales-First Suite: AI Sales Co-Pilot, Canned Snippets (/), In-Chat Lead CRM."
create_milestone "v1.2.0-omnichannel" "Omnichannel & Forms: Instagram Direct DMs, Facebook Messenger, WhatsApp Flows 3.0."
create_milestone "v1.3.0-integrations" "E-Commerce & Attribution: Shopify & WooCommerce Direct Webhooks, Meta CAPI."
create_milestone "v2.0.0-enterprise" "Enterprise Expansion: Multi-Tenant Reseller White-Label Portal & Native Mobile Apps."

# 2. Labels
create_label() {
  local name="$1"
  local color="$2"
  local desc="$3"
  curl -s -X POST "https://api.github.com/repos/$REPO/labels" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -d "{\"name\":\"$name\",\"color\":\"$color\",\"description\":\"$desc\"}" > /dev/null
  echo "Processed Label: $name"
}

create_label "meta:api-v21" "0084FF" "Meta WhatsApp Business Platform v21.0 compliance"
create_label "module:sales-ai" "9333EA" "AI Sales Co-Pilot & Smart Reply features"
create_label "module:sales-tools" "F59E0B" "Canned snippets, payment links, booking links"
create_label "module:lead-crm" "3B82F6" "Visual sales pipeline, deal stages, and notes"
create_label "module:campaigns" "10B981" "Bulk broadcast engine and rate calculator"
create_label "module:flows" "6366F1" "Visual flow builder and bot engine"
create_label "module:ecommerce" "EC4899" "Shopify and WooCommerce connectors"
create_label "module:multichannel" "06B6D4" "Instagram Direct and Messenger webhooks"
create_label "type:bug" "EF4444" "Something isn't working as expected"
create_label "type:feature" "10B981" "New feature or capability request"
create_label "priority:critical" "DC2626" "Urgent fix required"
create_label "ci/cd" "64748B" "GitHub Actions, Docker, and deployment workflows"

echo "GitHub Operations Setup Complete!"
