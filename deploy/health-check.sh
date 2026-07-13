#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/techpulse}"
TECHPULSE_HEALTH_URL="${TECHPULSE_HEALTH_URL:-http://127.0.0.1:8103/health.json}"
TECHPULSE_PUBLIC_HEALTH_URL="${TECHPULSE_PUBLIC_HEALTH_URL:-}"
STATE_FILE="${STATE_FILE:-/tmp/techpulse-health-state}"

cd "$APP_DIR"

if [ -f .env.production ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
fi

notify() {
  message="$1"
  if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
    echo "$message"
    return 0
  fi

  curl --fail --silent --show-error \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"${message}\",\"disable_web_page_preview\":true}" >/dev/null
}

check_url() {
  name="$1"
  url="$2"
  curl --fail --silent --show-error --max-time 15 "$url" >/dev/null || {
    echo "$name failed: $url"
    return 1
  }
}

status="ok"
details=""

if ! output="$(check_url "TechPulse static site" "$TECHPULSE_HEALTH_URL" 2>&1)"; then
  status="failed"
  details="${details}
- ${output}"
fi

if [ -n "$TECHPULSE_PUBLIC_HEALTH_URL" ]; then
  if ! output="$(check_url "TechPulse public site" "$TECHPULSE_PUBLIC_HEALTH_URL" 2>&1)"; then
    status="failed"
    details="${details}
- ${output}"
  fi
fi

previous="unknown"
[ -f "$STATE_FILE" ] && previous="$(cat "$STATE_FILE")"

if [ "$status" = "failed" ]; then
  echo "failed" > "$STATE_FILE"
  if [ "$previous" != "failed" ]; then
    notify "TechPulse health check failed${details}"
  fi
  exit 1
fi

echo "ok" > "$STATE_FILE"
if [ "$previous" = "failed" ]; then
  notify "TechPulse recovered: health check is healthy."
fi

echo "TechPulse health check ok."
