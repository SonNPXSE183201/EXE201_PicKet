#!/usr/bin/env bash
# Build and switch api+web to a new release on the VPS, rolling back on a failed health check.
# Usage (on the server): deploy/release.sh <tag> <path-to-source.tar.gz>
# Used by .github/workflows/deploy-production.yml; safe to run by hand with the same arguments.
set -euo pipefail
TAG=${1:?release tag required}
ARCHIVE=${2:?source archive required}
[[ $TAG =~ ^[a-z0-9][a-z0-9.-]{2,80}$ ]] || { echo "bad tag: $TAG"; exit 2; }
BASE=/opt/picket
RELEASE=$BASE/releases/$TAG
ENV_FILE=$BASE/deploy/.env.production
[[ -e $RELEASE/source ]] && { echo "release $TAG already exists"; exit 3; }
mkdir -p "$RELEASE/source"
install -m 600 "$ARCHIVE" "$RELEASE/source.tar.gz"
tar -xzf "$RELEASE/source.tar.gz" -C "$RELEASE/source"

cat > "$RELEASE/candidate.compose.yml" <<EOF
services:
  web:
    image: picket-web:$TAG
    build:
      context: $RELEASE/source
      dockerfile: web/Dockerfile
  api:
    image: picket-api:$TAG
    build:
      context: $RELEASE/source/apps/api
      dockerfile: Dockerfile
EOF

BUILD=(docker compose -p picket --env-file "$ENV_FILE" -f "$BASE/compose.production.yml" -f "$RELEASE/candidate.compose.yml")
"${BUILD[@]}" config --quiet
"${BUILD[@]}" build api > "$RELEASE/build-api.log" 2>&1 || { tail -n 60 "$RELEASE/build-api.log"; exit 5; }
"${BUILD[@]}" build web > "$RELEASE/build-web.log" 2>&1 || { tail -n 60 "$RELEASE/build-web.log"; exit 6; }

C=(docker compose -p picket --env-file "$ENV_FILE" -f "$BASE/compose.production.yml")
install -m 600 "$ENV_FILE" "$RELEASE/env.before"
OLD_API=$(sed -n 's/^PICKET_API_IMAGE=//p' "$ENV_FILE")
OLD_WEB=$(sed -n 's/^PICKET_WEB_IMAGE=//p' "$ENV_FILE")
rollback() { install -m 600 "$RELEASE/env.before" "$ENV_FILE"; "${C[@]}" up -d --no-deps --no-build api web >/dev/null; echo "Rolled back to $OLD_API $OLD_WEB"; }
sed -i "s|^PICKET_API_IMAGE=.*|PICKET_API_IMAGE=picket-api:$TAG|; s|^PICKET_WEB_IMAGE=.*|PICKET_WEB_IMAGE=picket-web:$TAG|" "$ENV_FILE"
"${C[@]}" up -d --no-deps --no-build api web || { rollback; exit 7; }

code() { curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$@" || echo 000; }
for _ in {1..60}; do
  p=$(code 'https://api.picketfinance.com/v1/releases/policy?channel=apk')
  f=$(code 'https://api.picketfinance.com/v1/forecast/settings')
  w=$(code 'https://app.picketfinance.com/register')
  if [[ $p == 200 && $f == 200 && $w == 200 ]]; then
    docker inspect --format '{{.Name}} {{.Config.Image}} {{.State.Status}}' picket-api-1 picket-web-1
    echo "DEPLOY_OK $TAG (was $OLD_API $OLD_WEB)"
    exit 0
  fi
  sleep 2
done
echo "health failed policy=$p forecast=$f web=$w"
rollback
exit 8
