# TechPulse Deploy

TechPulse is deployed as a static Caddy container plus a daily systemd refresh job.

## Files

- `compose.yml`: serves this repository root on `${TECHPULSE_PORT:-8103}`.
- `deploy/deploy.sh`: initializes runtime files, writes Umami local config, starts the container, and verifies health.
- `deploy/techpulse-refresh.sh`: refreshes YouTube, GitHub, Hacker News, and product radar data transactionally.
- `deploy/systemd/techpulse-refresh.*`: daily timer and service for `/opt/techpulse`.
- `.env.production.example`: production environment template.

## Common commands

```bash
cd /opt/techpulse
git pull --ff-only origin main
./deploy/deploy.sh
sudo systemctl start techpulse-refresh.service
journalctl -u techpulse-refresh.service -n 100 --no-pager
```

## GitHub token

Add `GITHUB_TOKEN` to `.env.production` to increase GitHub API rate limits for product radar collection. The token only needs public repository read/search access.

## Refresh failure alerts

Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `/opt/techpulse/.env.production` to receive a Telegram alert if the daily refresh fails and rolls back to the previous release.

```bash
cd /opt/techpulse
node pipeline/send-alert.mjs test manual
sudo systemctl start techpulse-refresh.service
journalctl -u techpulse-refresh.service -n 120 --no-pager
```

If the VM only has Docker and no host-level Node.js runtime, run the alert test through the same Node image used by the refresh job:

```bash
cd /opt/techpulse
docker run --rm --env-file .env.production -v "$PWD:/work" -w /work "${NODE_IMAGE:-node:22-alpine}" node pipeline/send-alert.mjs test manual
```
