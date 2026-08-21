# WAYAPP Enterprise — GitHub Wiki Synchronization Script (PowerShell)
# Clones and pushes all files in docs/wiki/ directly to your GitHub Repository Wiki

param (
    [string]$Repo = "usmankhan4001/WAYAPP",
    [string]$Token = $env:GITHUB_TOKEN
)

if (-not $Token) {
    Write-Host "Please provide a GitHub Personal Access Token via -Token or `$env:GITHUB_TOKEN" -ForegroundColor Yellow
    Write-Host "Usage: .\scripts\sync-wiki.ps1 -Token 'ghp_yourTokenHere' -Repo 'usmankhan4001/WAYAPP'" -ForegroundColor Cyan
    exit 1
}

$wikiUrl = "https://${Token}@github.com/${Repo}.wiki.git"
$tempDir = Join-Path $env:TEMP "wayapp_wiki_$(Get-Random)"
$sourceWikiDir = Join-Path $PSScriptRoot "..\docs\wiki"

Write-Host "`n🚀 Synchronizing WAYAPP Wiki with GitHub Wiki: $Repo.wiki..." -ForegroundColor Green

try {
    # 1. Clone Wiki Repo
    Write-Host "Cloning Wiki repository..." -ForegroundColor Cyan
    git clone $wikiUrl $tempDir --quiet
    
    if (-not (Test-Path $tempDir)) {
        Write-Host "⚠️ Failed to clone wiki repository. Please ensure you have created the first page in GitHub Wiki UI first." -ForegroundColor Yellow
        exit 1
    }

    # 2. Copy markdown files from docs/wiki
    Write-Host "Copying documentation pages..." -ForegroundColor Cyan
    Copy-Item -Path "$sourceWikiDir\*" -Destination $tempDir -Recurse -Force

    # 3. Commit and Push
    Push-Location $tempDir
    git config user.name "WAYAPP DocBot"
    git config user.email "bot@gccstartup.com"
    git add .
    git commit -m "docs: sync full enterprise wiki documentation" --quiet
    git push origin master --quiet
    Pop-Location

    Write-Host "`n🎉 Full Enterprise Wiki successfully pushed to GitHub Wiki!" -ForegroundColor Green
    Write-Host "View live Wiki at: https://github.com/$Repo/wiki" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️ Error syncing wiki: $_" -ForegroundColor Red
} finally {
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    }
}
