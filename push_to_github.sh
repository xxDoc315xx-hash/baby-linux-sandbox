#!/bin/bash
# Push all branches and tags to Doc's GitHub repository
# Usage: ./push_to_github.sh <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>

TOKEN="$1"
REPO="github.com/xxDoc315xx-hash/baby-linux-sandbox.git"

if [ -z "$TOKEN" ]; then
  echo "Usage: ./push_to_github.sh <YOUR_GITHUB_TOKEN>"
  echo "Or set GITHUB_TOKEN environment variable."
  TOKEN="$GITHUB_TOKEN"
fi

if [ -z "$TOKEN" ]; then
  echo "Error: No GitHub token provided."
  exit 1
fi

echo "Configuring remote with token..."
git remote set-url origin "https://${TOKEN}@${REPO}"

echo "Pushing main branch to GitHub..."
git push -u origin main --force

echo "Push complete!"
