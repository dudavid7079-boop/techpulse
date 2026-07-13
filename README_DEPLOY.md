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
