#!/usr/bin/env bash
# Deploy Visual Pi Card to Contabo VPS
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh            # full deploy (provision + sync + restart)
#   ./deploy.sh sync       # sync code + restart only
#   ./deploy.sh logs       # tail service logs
#   ./deploy.sh status     # systemd status
set -euo pipefail

# ─── CONFIG ────────────────────────────────────────────────────────────────
SERVER_IP="109.199.109.143"
SSH_USER="${SSH_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
DOMAIN="omendapipaysglobel.online"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@$DOMAIN}"
APP_DIR="/opt/visual-pi-card"
APP_PORT="3000"
SERVICE="visual-pi-card"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

SSH="ssh -p $SSH_PORT -i $SSH_KEY -o StrictHostKeyChecking=accept-new $SSH_USER@$SERVER_IP"

# ─── HELPERS ───────────────────────────────────────────────────────────────
log() { printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

sync_code() {
  log "rsync → $SSH_USER@$SERVER_IP:$APP_DIR"
  $SSH "mkdir -p $APP_DIR"
  rsync -az --delete \
    -e "ssh -p $SSH_PORT -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
    --exclude '.git' --exclude 'node_modules' --exclude '*.log' \
    --exclude '*.png' --exclude '*.zip' --exclude 'deploy.sh' \
    "$LOCAL_DIR/" "$SSH_USER@$SERVER_IP:$APP_DIR/"
}

install_deps() {
  log "Installing npm deps on server"
  $SSH "cd $APP_DIR && npm ci --omit=dev || npm install --omit=dev"
}

restart_service() {
  log "Restart $SERVICE"
  $SSH "systemctl restart $SERVICE && systemctl --no-pager status $SERVICE | head -15"
}

provision() {
  log "Provisioning Contabo VPS ($SERVER_IP) — Node, nginx, certbot, firewall"
  $SSH bash -s <<EOF
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ufw nginx rsync

# Node 20 LTS
if ! command -v node >/dev/null 2>&1 || [ "\$(node -v | cut -c2-3)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

# Firewall
ufw allow $SSH_PORT/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
yes | ufw enable || true

mkdir -p $APP_DIR

# systemd unit
cat > /etc/systemd/system/$SERVICE.service <<UNIT
[Unit]
Description=Visual Pi Card Node Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
User=root

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable $SERVICE

# nginx reverse proxy (HTTP only — certbot will inject SSL)
cat > /etc/nginx/sites-available/$DOMAIN <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Let's Encrypt (only if DNS already points here)
if ! command -v certbot >/dev/null 2>&1; then
  apt-get install -y -qq certbot python3-certbot-nginx
fi
if host $DOMAIN | grep -q "$SERVER_IP"; then
  certbot --nginx --non-interactive --agree-tos -m $ADMIN_EMAIL -d $DOMAIN -d www.$DOMAIN --redirect || echo "[warn] certbot failed — re-run later with: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
else
  echo "[warn] DNS for $DOMAIN does not resolve to $SERVER_IP yet — skipping SSL. Run later: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi
EOF
}

# ─── ENTRY ─────────────────────────────────────────────────────────────────
cmd="${1:-deploy}"
case "$cmd" in
  deploy)
    [ -f "$SSH_KEY" ] || die "SSH key not found: $SSH_KEY (set SSH_KEY=... or generate one)"
    provision
    sync_code
    install_deps
    $SSH "systemctl start $SERVICE || systemctl restart $SERVICE"
    restart_service
    log "Done — http://$DOMAIN  (https if DNS+certbot succeeded)"
    ;;
  sync)
    sync_code
    install_deps
    restart_service
    ;;
  logs)    $SSH "journalctl -u $SERVICE -f --no-pager" ;;
  status)  $SSH "systemctl --no-pager status $SERVICE" ;;
  ssl)     $SSH "certbot --nginx --non-interactive --agree-tos -m $ADMIN_EMAIL -d $DOMAIN -d www.$DOMAIN --redirect" ;;
  *)       die "Unknown command: $cmd  (use: deploy | sync | logs | status | ssl)" ;;
esac
