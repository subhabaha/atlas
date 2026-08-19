#!/usr/bin/env bash
# =============================================================================
# Deploy the Atlas Copco AI Engineering Demo Gallery to a web server.
#
# The gallery is a pure static site (HTML/CSS/JS, no backend, no build step),
# so "deploying" means copying this folder to the server and pointing a web
# server at it. This script does both over SSH.
#
# USAGE (run from your own machine, where you have SSH access to the server):
#     ./deploy.sh [user@host] [remote_path]
#
# Defaults:
#     user@host    = root@103.216.171.67
#     remote_path  = /var/www/atlas-demo
#
# Examples:
#     ./deploy.sh                              # root@103.216.171.67:/var/www/atlas-demo
#     ./deploy.sh azureuser@103.216.171.67     # different SSH user
#     ./deploy.sh ubuntu@203.0.113.10 /srv/www/demo
#
# It will:
#   1. rsync (or scp) the site to the server
#   2. install & configure nginx to serve it on port 80  (path /  → gallery)
#   3. print the URL to open
#
# Nothing here needs the internet on the server except apt for nginx. If nginx
# is already installed, that step is skipped. If you cannot run apt, see
# "SERVE WITHOUT NGINX" at the bottom of this file.
# =============================================================================
set -euo pipefail

TARGET="${1:-root@103.216.171.67}"
REMOTE_PATH="${2:-/var/www/atlas-demo}"
SITE_HOST="${TARGET##*@}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "──────────────────────────────────────────────────────────────"
echo " Atlas Copco AI Engineering — Demo Gallery deployment"
echo " Source : $SCRIPT_DIR"
echo " Target : $TARGET:$REMOTE_PATH"
echo "──────────────────────────────────────────────────────────────"

# Files/dirs to publish (exclude tooling & node_modules).
EXCLUDES=(--exclude 'node_modules' --exclude 'smoke.js' --exclude 'package*.json'
          --exclude 'BUILD-BRIEF.md' --exclude '.git' --exclude '*.map')

echo "▸ 1/3  Copying site to server ..."
if command -v rsync >/dev/null 2>&1; then
  rsync -az --delete "${EXCLUDES[@]}" \
    "$SCRIPT_DIR"/ "$TARGET:$REMOTE_PATH/"
else
  echo "  (rsync not found — falling back to scp; --delete not applied)"
  ssh "$TARGET" "mkdir -p '$REMOTE_PATH'"
  # tar over ssh, honouring excludes
  tar -C "$SCRIPT_DIR" \
      --exclude=node_modules --exclude=smoke.js --exclude='package*.json' \
      --exclude=BUILD-BRIEF.md --exclude=.git \
      -czf - . | ssh "$TARGET" "tar -C '$REMOTE_PATH' -xzf -"
fi

echo "▸ 2/3  Configuring nginx on the server ..."
ssh "$TARGET" REMOTE_PATH="$REMOTE_PATH" SITE_HOST="$SITE_HOST" 'bash -s' <<'REMOTE'
set -e
if ! command -v nginx >/dev/null 2>&1; then
  echo "  installing nginx ..."
  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq && apt-get install -y -qq nginx
  elif command -v yum >/dev/null 2>&1; then
    yum install -y nginx
  else
    echo "  !! No apt/yum. Install a web server manually and point it at $REMOTE_PATH"
    exit 0
  fi
fi

CONF=/etc/nginx/conf.d/atlas-demo.conf
# Disable the default site if present so / serves our gallery.
[ -f /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default || true

cat > "$CONF" <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root ${REMOTE_PATH};
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }

    # long cache for the shared assets (they are versioned by content)
    location /assets/ {
        expires 7d;
        add_header Cache-Control "public";
    }

    gzip on;
    gzip_types text/css application/javascript text/html image/svg+xml;
}
EOF

nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx 2>/dev/null || service nginx restart
echo "  nginx configured and restarted."
REMOTE

echo "▸ 3/3  Done."
echo "──────────────────────────────────────────────────────────────"
echo " ✅  Gallery is live:"
echo "        http://$SITE_HOST/"
echo ""
echo " Each task has its own link, e.g.:"
echo "        http://$SITE_HOST/day1/task1.html   (SPC console)"
echo "        http://$SITE_HOST/day3/task2.html   (retrieval benchmark)"
echo "        http://$SITE_HOST/day5/task4.html   (capstone)"
echo "──────────────────────────────────────────────────────────────"

# =============================================================================
# SERVE WITHOUT NGINX (fallbacks, run ON the server inside $REMOTE_PATH):
#
#   Python (any box with python3):
#       cd /var/www/atlas-demo && python3 -m http.server 80
#
#   Caddy (auto-HTTPS if you have a domain):
#       caddy file-server --root /var/www/atlas-demo --listen :80
#
#   Docker (nginx):
#       docker run -d --name atlas-demo -p 80:80 \
#         -v /var/www/atlas-demo:/usr/share/nginx/html:ro nginx:alpine
# =============================================================================
