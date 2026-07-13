#!/usr/bin/env sh
set -eu

if [ -f .env.production ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
fi

TECHPULSE_PORT="${TECHPULSE_PORT:-8103}"
TECHPULSE_PUBLIC_URL="${TECHPULSE_PUBLIC_URL:-https://techpulse.attodigitalhk.com}"
TECHPULSE_RELEASE_MARKER="${TECHPULSE_RELEASE_MARKER:-20260712-product-radar-v2}"
TECHPULSE_REQUIRE_PUBLIC_CHECK="${TECHPULSE_REQUIRE_PUBLIC_CHECK:-false}"
NODE_IMAGE="${NODE_IMAGE:-node:22-alpine}"

if command -v node >/dev/null 2>&1; then
  node pipeline/init-runtime-data.mjs
else
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -v "$(pwd):/work" \
    -w /work \
    "$NODE_IMAGE" \
    node pipeline/init-runtime-data.mjs
fi

cat > analytics-config.local.json <<EOF
{
  "scriptUrl": "${TECHPULSE_UMAMI_SCRIPT_URL:-}",
  "websiteId": "${TECHPULSE_UMAMI_WEBSITE_ID:-}"
}
EOF

docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps

for attempt in $(seq 1 20); do
  if curl --fail --silent --show-error "http://127.0.0.1:${TECHPULSE_PORT}/health.json" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 20 ]; then
    printf 'TechPulse health check failed after %s attempts\n' "$attempt" >&2
    exit 1
  fi
  sleep 2
done

verify_products_release() {
  url="$1"
  label="$2"
  page="$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 "${url}/products.html?release=${TECHPULSE_RELEASE_MARKER}")"
  if ! printf '%s' "$page" | grep -Fq "$TECHPULSE_RELEASE_MARKER"; then
    printf '%s products page is stale: expected release marker %s at %s/products.html\n' \
      "$label" "$TECHPULSE_RELEASE_MARKER" "$url" >&2
    return 1
  fi
  printf '%s products page verified: %s\n' "$label" "$TECHPULSE_RELEASE_MARKER"
}

verify_products_release "http://127.0.0.1:${TECHPULSE_PORT}" "Local TechPulse"

if ! verify_products_release "$TECHPULSE_PUBLIC_URL" "Public TechPulse"; then
  printf '%s\n' \
    "Public verification was unavailable from this host. FRP/NPM loopback may be blocked." \
    "Verify ${TECHPULSE_PUBLIC_URL}/products.html from an external network." >&2
  if [ "$TECHPULSE_REQUIRE_PUBLIC_CHECK" = "true" ]; then
    exit 1
  fi
fi

docker image prune -f
