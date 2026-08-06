#!/usr/bin/env bash
# Direct deploy to omendapipaysglobel.online over SSH (port 22).
# Usage:  ./deploy.sh <cpanel-username>
# You will be prompted for your cPanel password by ssh/rsync.
set -euo pipefail

HOST="omendapipaysglobel.online"
PORT=22
TARGET="public_html/"
USER_NAME="${1:-}"

if [[ -z "$USER_NAME" ]]; then
  read -rp "cPanel SSH username: " USER_NAME
fi

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SRC_DIR"

echo "Deploying $SRC_DIR  ->  $USER_NAME@$HOST:$TARGET"

rsync -avz --progress \
  -e "ssh -p $PORT -o StrictHostKeyChecking=accept-new" \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'node_modules' \
  --exclude 'package-lock.json' \
  --exclude '.vscode' \
  --exclude '.env' \
  --exclude '.env.example' \
  --exclude 'deploy.ps1' \
  --exclude 'git-deploy.ps1' \
  --exclude 'deploy.sh' \
  --exclude 'README.md' \
  ./ "$USER_NAME@$HOST:$TARGET"

echo ""
echo "DONE. Live at: https://$HOST"
