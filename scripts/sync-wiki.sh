#!/usr/bin/env bash
# WAYAPP Enterprise — GitHub Wiki Synchronization Script (Bash)
# Clones and pushes all files in docs/wiki/ directly to your GitHub Repository Wiki

REPO="${1:-usmankhan4001/WAYAPP}"
TOKEN="${2:-$GITHUB_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "Usage: ./scripts/sync-wiki.sh <owner/repo> <github_token>"
  echo "Example: ./scripts/sync-wiki.sh usmankhan4001/WAYAPP ghp_yourTokenHere"
  exit 1
fi

WIKI_URL="https://${TOKEN}@github.com/${REPO}.wiki.git"
TEMP_DIR="/tmp/wayapp_wiki_$$"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../docs/wiki" && pwd)"

echo "🚀 Synchronizing WAYAPP Wiki with GitHub Wiki: ${REPO}.wiki..."

git clone "$WIKI_URL" "$TEMP_DIR" --quiet || {
  echo "⚠️ Failed to clone wiki repo. Please ensure you have created the first wiki page on GitHub UI."
  exit 1
}

cp -r "$SOURCE_DIR"/* "$TEMP_DIR"/

cd "$TEMP_DIR"
git config user.name "WAYAPP DocBot"
git config user.email "bot@gccstartup.com"
git add .
git commit -m "docs: sync full enterprise wiki documentation" --quiet
git push origin master --quiet

rm -rf "$TEMP_DIR"

echo "🎉 Full Enterprise Wiki successfully pushed to GitHub Wiki!"
echo "View live Wiki at: https://github.com/${REPO}/wiki"
