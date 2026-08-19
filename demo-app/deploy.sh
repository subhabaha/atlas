#!/usr/bin/env bash
# =============================================================================
# Deploy the Atlas Copco AI Engineering Demo Gallery to a web server.
#
# The gallery is a pure static site (HTML/CSS/JS, no backend, no build step),
# so "deploying" means copying this folder to the server and pointing a web
# server at it. All internal links are RELATIVE, so the site works served from
# a subpath (e.g. /atlas-demo/) or from a docroot — your choice.
#
# Run this from a machine that has SSH access to the server (e.g. your Mac,
# which holds the SSH key / ~/.ssh/config alias).
#
# USAGE:
#     ./deploy.sh [ssh_target] [remote_path] [public_host]
#
#   ssh_target   default: root@103.216.171.67   (an ~/.ssh/config alias like
#                                                 `ragsys` also works)
#   remote_path  default: /var/www/atlas-demo    (where files are copied)
#   public_host  default: 103.216.171.67         (only used for printed URLs)
#
# By DEFAULT this script is NON-DESTRUCTIVE: it only copies the files and then
# prints the exact nginx `location` snippet to serve them at /atlas-demo/ under
# your EXISTING site (keeping your current vhost and TLS untouched). It does not
# modify nginx unless you ask it to.
#
#   ./deploy.sh ragsys                       # copy via your ssh alias, print snippet
#   ./deploy.sh root@103.216.171.67          # copy, print snippet
#
# OPTIONAL automation (pick ONE), passed as a 4th argument or env FLAG:
#   FLAG=--location    Adds the /atlas-demo/ location into your DEFAULT nginx
#                      server block for you and reloads nginx (edits are made to
#                      a drop-in include; your existing vhost/TLS is preserved).
#                      → served at http(s)://<public_host>/atlas-demo/
#   FLAG=--standalone  Creates a dedicated vhost that OWNS port 80 default_server
#                      and disables the packaged default site. Use only on a
#                      server where this gallery is the primary site.
#                      → served at http://<public_host>/
#
#   FLAG=--location ./deploy.sh ragsys
#   ./deploy.sh ragsys /var/www/atlas-demo 103.216.171.67 --location
# =============================================================================
set -euo pipefail

TARGET="${1:-root@103.216.171.67}"
REMOTE_PATH="${2:-/var/www/atlas-demo}"
SITE_HOST_RAW="${TARGET##*@}"                 # strips user@ ; may be an alias
PUBLIC_HOST="${3:-}"
FLAG="${FLAG:-${4:-}}"                          # --location | --standalone | (none)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# If public host not given, use the target host when it looks like a real host
# (contains a dot), otherwise fall back to the known server IP.
if [ -z "$PUBLIC_HOST" ]; then
  case "$SITE_HOST_RAW" in *.*) PUBLIC_HOST="$SITE_HOST_RAW";; *) PUBLIC_HOST="103.216.171.67";; esac
fi

echo "──────────────────────────────────────────────────────────────"
echo " Atlas Copco AI Engineering — Demo Gallery deployment"
echo " Source     : $SCRIPT_DIR"
echo " SSH target : $TARGET"
echo " Remote path: $REMOTE_PATH"
echo " Public host: $PUBLIC_HOST"
echo " Mode       : ${FLAG:-copy-only (non-destructive)}"
echo "──────────────────────────────────────────────────────────────"

EXCLUDES=(--exclude 'node_modules' --exclude 'smoke.js' --exclude 'package*.json'
          --exclude 'BUILD-BRIEF.md' --exclude '.git' --exclude '*.map')

echo "▸ Copying site to server ..."
if command -v rsync >/dev/null 2>&1; then
  ssh "$TARGET" "mkdir -p '$REMOTE_PATH'"
  rsync -az --delete "${EXCLUDES[@]}" "$SCRIPT_DIR"/ "$TARGET:$REMOTE_PATH/"
else
  echo "  (rsync not found — using scp/tar; --delete not applied)"
  ssh "$TARGET" "mkdir -p '$REMOTE_PATH'"
  tar -C "$SCRIPT_DIR" --exclude=node_modules --exclude=smoke.js \
      --exclude='package*.json' --exclude=BUILD-BRIEF.md --exclude=.git \
      -czf - . | ssh "$TARGET" "tar -C '$REMOTE_PATH' -xzf -"
fi
echo "  ✓ files copied to $TARGET:$REMOTE_PATH"

case "$FLAG" in
  --location)
    echo "▸ Adding an /atlas-demo/ location to your default nginx server ..."
    ssh "$TARGET" REMOTE_PATH="$REMOTE_PATH" 'bash -s' <<'REMOTE'
set -e
command -v nginx >/dev/null || { echo "  !! nginx not found on server"; exit 1; }
SNIP=/etc/nginx/snippets/atlas-demo.conf
mkdir -p /etc/nginx/snippets
cat > "$SNIP" <<EOF
location = /atlas-demo { return 301 /atlas-demo/; }
location /atlas-demo/ {
    alias ${REMOTE_PATH}/;
    index index.html;
    try_files \$uri \$uri/ =404;
}
EOF
# Try to include the snippet in the default server block if not already included.
DEF=""
for c in /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf; do
  [ -f "$c" ] && DEF="$c" && break
done
if [ -n "$DEF" ] && ! grep -q 'snippets/atlas-demo.conf' "$DEF"; then
  # insert the include just after the first "server {" line
  awk 'NR==1{p=0} /server[[:space:]]*\{/ && !p {print; print "    include /etc/nginx/snippets/atlas-demo.conf;"; p=1; next} {print}' "$DEF" > "$DEF.tmp" && mv "$DEF.tmp" "$DEF"
  echo "  included snippet in $DEF"
else
  echo "  NOTE: could not auto-locate a default server block, OR it is already included."
  echo "        Add this line inside the server{} you want, then reload nginx:"
  echo "            include /etc/nginx/snippets/atlas-demo.conf;"
fi
nginx -t && (systemctl reload nginx 2>/dev/null || service nginx reload)
echo "  ✓ nginx reloaded"
REMOTE
    echo "──────────────────────────────────────────────────────────────"
    echo " ✅  Gallery is live at:"
    echo "        http://$PUBLIC_HOST/atlas-demo/     (and https:// if TLS is on)"
    echo "        e.g. http://$PUBLIC_HOST/atlas-demo/day1/task1.html"
    ;;

  --standalone)
    echo "▸ Configuring a DEDICATED nginx vhost (owns port 80) ..."
    ssh "$TARGET" REMOTE_PATH="$REMOTE_PATH" 'bash -s' <<'REMOTE'
set -e
if ! command -v nginx >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y -qq nginx;
  elif command -v yum >/dev/null 2>&1; then yum install -y nginx; else echo "  install a web server manually"; exit 0; fi
fi
[ -f /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default || true
cat > /etc/nginx/conf.d/atlas-demo.conf <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root ${REMOTE_PATH};
    index index.html;
    location / { try_files \$uri \$uri/ =404; }
    location /assets/ { expires 7d; add_header Cache-Control "public"; }
    gzip on; gzip_types text/css application/javascript text/html image/svg+xml;
}
EOF
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx 2>/dev/null || service nginx restart
echo "  ✓ standalone vhost active"
REMOTE
    echo "──────────────────────────────────────────────────────────────"
    echo " ✅  Gallery is live at:  http://$PUBLIC_HOST/"
    ;;

  *)
    cat <<EOF
──────────────────────────────────────────────────────────────
 ✅  Files are on the server. NOTHING on nginx was changed.

 To serve them, add ONE nginx location to the server block that
 already handles $PUBLIC_HOST (keeps your existing vhost + TLS),
 then reload nginx:

     location = /atlas-demo { return 301 /atlas-demo/; }
     location /atlas-demo/ {
         alias ${REMOTE_PATH}/;
         index index.html;
         try_files \$uri \$uri/ =404;
     }

 Then browse:
     https://$PUBLIC_HOST/atlas-demo/
     https://$PUBLIC_HOST/atlas-demo/day1/task1.html

 Or let this script do it for you:
     FLAG=--location ./deploy.sh $TARGET
──────────────────────────────────────────────────────────────
EOF
    ;;
esac

# =============================================================================
# SERVE WITHOUT NGINX (run ON the server inside $REMOTE_PATH):
#   Python:  cd $REMOTE_PATH && python3 -m http.server 8080
#   Caddy :  caddy file-server --root $REMOTE_PATH --listen :80
#   Docker:  docker run -d -p 80:80 -v $REMOTE_PATH:/usr/share/nginx/html:ro nginx:alpine
# =============================================================================
