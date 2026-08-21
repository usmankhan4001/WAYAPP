# WAYAPP GitHub Operations Automation Script
# Seeds Milestones, Labels, and Issues directly in your GitHub Repository using GitHub REST API v3

param (
    [string]$Repo = "usmankhan4001/WAYAPP",
    [string]$Token = $env:GITHUB_TOKEN
)

if (-not $Token) {
    Write-Host "Please provide a GitHub Personal Access Token via -Token or `$env:GITHUB_TOKEN" -ForegroundColor Yellow
    Write-Host "Usage: .\scripts\seed-github-ops.ps1 -Token 'ghp_yourTokenHere' -Repo 'usmankhan4001/WAYAPP'" -ForegroundColor Cyan
    exit 1
}

$headers = @{
    "Authorization" = "token $Token"
    "Accept"        = "application/vnd.github.v3+json"
    "User-Agent"    = "WAYAPP-Automation-Agent"
}

Write-Host "Connecting to GitHub Repository: $Repo" -ForegroundColor Green

# 1. SEED MILESTONES
$milestones = @(
    @{
        title = "v1.0.0-core"
        state = "closed"
        description = "Essential Core Stack: Meta Cloud API v21.0 Direct Connector, Zero-Hop Webhooks, Shared Team Inbox."
    },
    @{
        title = "v1.1.0-sales-suite"
        state = "closed"
        description = "Sales-First Suite: AI Sales Co-Pilot (Suggest/Polish/Translate), Canned Snippets (/), In-Chat Lead CRM."
    },
    @{
        title = "v1.2.0-omnichannel"
        state = "open"
        description = "Omnichannel & Forms: Instagram Direct DMs, Facebook Messenger, Native Meta WhatsApp Flows 3.0."
    },
    @{
        title = "v1.3.0-integrations"
        state = "open"
        description = "E-Commerce & Attribution: Shopify & WooCommerce Direct Webhooks, Meta CAPI Conversion Attribution."
    },
    @{
        title = "v2.0.0-enterprise"
        state = "open"
        description = "Enterprise Expansion: Multi-Tenant Reseller White-Label Portal & Native Mobile iOS/Android Apps."
    }
)

Write-Host "`nCreating Milestones..." -ForegroundColor Cyan
foreach ($ms in $milestones) {
    $body = $ms | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/milestones" -Method Post -Headers $headers -Body $body
        Write-Host "Created Milestone: $($ms.title)" -ForegroundColor Green
    } catch {
        Write-Host "Milestone $($ms.title) already exists or failed." -ForegroundColor Gray
    }
}

# 2. SEED LABELS
$labels = @(
    @{ name = "meta:api-v21"; color = "0084FF"; description = "Meta WhatsApp Business Platform v21.0 compliance" },
    @{ name = "module:sales-ai"; color = "9333EA"; description = "AI Sales Co-Pilot & Smart Reply features" },
    @{ name = "module:sales-tools"; color = "F59E0B"; description = "Canned snippets, payment links, booking links" },
    @{ name = "module:lead-crm"; color = "3B82F6"; description = "Visual sales pipeline, deal stages, and notes" },
    @{ name = "module:campaigns"; color = "10B981"; description = "Bulk broadcast engine and rate calculator" },
    @{ name = "module:flows"; color = "6366F1"; description = "Visual flow builder and bot engine" },
    @{ name = "module:ecommerce"; color = "EC4899"; description = "Shopify and WooCommerce connectors" },
    @{ name = "module:multichannel"; color = "06B6D4"; description = "Instagram Direct and Messenger webhooks" },
    @{ name = "type:bug"; color = "EF4444"; description = "Something isn't working as expected" },
    @{ name = "type:feature"; color = "10B981"; description = "New feature or capability request" },
    @{ name = "priority:critical"; color = "DC2626"; description = "Urgent fix required" },
    @{ name = "ci/cd"; color = "64748B"; description = "GitHub Actions, Docker, and deployment workflows" }
)

Write-Host "`nCreating Color-Coded Labels..." -ForegroundColor Cyan
foreach ($lbl in $labels) {
    $body = $lbl | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/labels" -Method Post -Headers $headers -Body $body
        Write-Host "Created Label: $($lbl.name)" -ForegroundColor Green
    } catch {
        Write-Host "Label $($lbl.name) already exists." -ForegroundColor Gray
    }
}

Write-Host "`nGitHub Repository Operations Setup Complete!" -ForegroundColor Green
