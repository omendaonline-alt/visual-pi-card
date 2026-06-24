#!/usr/bin/env bash
# Safe static sync to live nginx root at /var/www/pivisualcard/ on Contabo.
# Bumps the service-worker cache version so PWA clients auto-refresh.
set -euo pipefail

HOST="root@109.199.109.143"
REMOTE_DIR="/var/www/pivisualcard"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$LOCAL_DIR"

echo "[deploy] rsync -> $HOST:$REMOTE_DIR"
rsync -avz --delete \
  --exclude '.git' --exclude 'node_modules' --exclude '.env' \
  --exclude 'deploy.sh' --exclude 'deploy.ps1' --exclude 'git-deploy.ps1' \
  --exclude 'deploy-live.sh' \
  --exclude '.github' --exclude '.vscode' --exclude '*.log' --exclude '*.zip' \
  --exclude 'map_screenshot.png' --exclude '# Code Citations.md' \
  --exclude 'validation-key.txt' \
  --exclude 'package-lock.json' --exclude 'ecosystem.config.js' \
  -e ssh \
  ./ "$HOST:$REMOTE_DIR/"

echo "[deploy] bump service-worker cache version"
ssh "$HOST" "sed -i -E \"s/pivisualcard-v[0-9a-zA-Z._-]+/pivisualcard-v\$(date +%s)/\" $REMOTE_DIR/sw.js && grep CACHE_NAME $REMOTE_DIR/sw.js | head -1"

echo "[deploy] reload nginx"
ssh "$HOST" 'nginx -t && systemctl reload nginx && echo NGINX_OK'

echo "[deploy] restart pm2 pivisualcard"
ssh "$HOST" 'pm2 restart pivisualcard --update-env && pm2 save'

echo "[deploy] live check"
wget -qO- --timeout=8 --no-check-certificate -O /dev/null -S https://omendapipaysglobel.online/ 2>&1 | grep -E 'HTTP/|Last-Modified|Content-Length'
