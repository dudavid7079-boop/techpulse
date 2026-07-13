#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/techpulse}"
TECHPULSE_DIR="${TECHPULSE_DIR:-${APP_DIR}}"
RSS_RECENT_HOURS="${RSS_RECENT_HOURS:-168}"
NODE_IMAGE="${NODE_IMAGE:-node:22-alpine}"

cd "$TECHPULSE_DIR"

BACKUP_DIR="$(mktemp -d)"
CURRENT_STAGE="initialization"
RELEASE_FILES="
data.generated.js
product-data.generated.js
pipeline/discovered.real.json
pipeline/candidates.real.json
pipeline/daily-digest.real.json
pipeline/product-seeds.generated.json
pipeline/product-signals.real.json
"

for file in $RELEASE_FILES; do
  if [ -f "$file" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp "$file" "$BACKUP_DIR/$file"
  fi
done

write_refresh_status() {
  status="$1"
  finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{\n  "status": "%s",\n  "stage": "%s",\n  "finishedAt": "%s",\n  "usingPreviousRelease": %s\n}\n' \
    "$status" "$CURRENT_STAGE" "$finished_at" "$2" > pipeline/refresh-status.json
}

finish_refresh() {
  exit_code="$?"
  if [ "$exit_code" -ne 0 ]; then
    for file in $RELEASE_FILES; do
      if [ -f "$BACKUP_DIR/$file" ]; then
        cp "$BACKUP_DIR/$file" "$file"
      fi
    done
    write_refresh_status "failed" "true"
    echo "TechPulse refresh failed during ${CURRENT_STAGE}; restored previous release." >&2
  fi
  rm -rf "$BACKUP_DIR"
}

trap finish_refresh EXIT HUP INT TERM

ENV_FILE="${APP_DIR}/.env.production"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ENV_FILE"
  set +a
fi

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  CURRENT_STAGE="video-pipeline"
  RSS_RECENT_HOURS="$RSS_RECENT_HOURS" node pipeline/run-real-preview.mjs
  CURRENT_STAGE="product-discovery"
  node pipeline/discover-products.mjs
  CURRENT_STAGE="product-signals"
  node pipeline/collect-product-signals.mjs pipeline/product-seeds.generated.json
  CURRENT_STAGE="product-build"
  node pipeline/build-products.mjs pipeline/product-seeds.generated.json
  CURRENT_STAGE="validation"
  npm run prelaunch
elif command -v docker >/dev/null 2>&1; then
  DOCKER_ENV_ARGS=""
  if [ -f "$ENV_FILE" ]; then
    DOCKER_ENV_ARGS="--env-file $ENV_FILE"
  fi

  # shellcheck disable=SC2086
  CURRENT_STAGE="containerized-pipeline"
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    $DOCKER_ENV_ARGS \
    -e HOME=/tmp \
    -e npm_config_cache=/tmp/.npm \
    -e RSS_RECENT_HOURS="$RSS_RECENT_HOURS" \
    -v "${TECHPULSE_DIR}:/work" \
    -w /work \
    "$NODE_IMAGE" \
    sh -lc 'node pipeline/run-real-preview.mjs && node pipeline/discover-products.mjs && node pipeline/collect-product-signals.mjs pipeline/product-seeds.generated.json && node pipeline/build-products.mjs pipeline/product-seeds.generated.json && npm run prelaunch'
else
  echo "Error: node/npm are not installed and docker is not available." >&2
  exit 127
fi

CURRENT_STAGE="complete"
write_refresh_status "success" "false"
echo "TechPulse refresh complete: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
