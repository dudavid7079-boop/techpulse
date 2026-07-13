# Migrate TechPulse to `/opt/techpulse`

This guide moves TechPulse out of the combined `/opt/globalpilot` checkout into its own repository and runtime directory.

## Target

- Repository: `https://github.com/dudavid7079-boop/techpulse.git`
- Runtime directory: `/opt/techpulse`
- Static container port: `127.0.0.1:8103`
- Public domain: `https://techpulse.attodigitalhk.com`

## One-time migration

```bash
set -eu

sudo systemctl stop techpulse-refresh.timer 2>/dev/null || true
sudo systemctl stop techpulse-refresh.service 2>/dev/null || true

cd /opt/globalpilot
docker compose -f compose.techpulse.yml --env-file .env.production down || true

sudo mkdir -p /opt/techpulse
sudo chown "$USER":"$USER" /opt/techpulse

if [ ! -d /opt/techpulse/.git ]; then
  git clone https://github.com/dudavid7079-boop/techpulse.git /opt/techpulse
else
  cd /opt/techpulse
  git pull --ff-only origin main
fi

cd /opt/techpulse
cp .env.production.example .env.production

# Carry over existing TechPulse values from the old combined env file.
if [ -f /opt/globalpilot/.env.production ]; then
  for key in \
    TECHPULSE_BIND \
    TECHPULSE_PORT \
    TECHPULSE_PUBLIC_URL \
    TECHPULSE_PUBLIC_HEALTH_URL \
    TECHPULSE_UMAMI_SCRIPT_URL \
    TECHPULSE_UMAMI_WEBSITE_ID \
    GITHUB_TOKEN \
    PRODUCT_SIGNAL_TIMEOUT_MS \
    TELEGRAM_BOT_TOKEN \
    TELEGRAM_CHAT_ID
  do
    value="$(grep -E "^${key}=" /opt/globalpilot/.env.production | tail -n 1 || true)"
    if [ -n "$value" ]; then
      if grep -qE "^${key}=" .env.production; then
        sed -i "s|^${key}=.*|${value}|" .env.production
      else
        printf '%s\n' "$value" >> .env.production
      fi
    fi
  done
fi

chmod 600 .env.production
chmod +x deploy/*.sh

./deploy/deploy.sh

sudo cp deploy/systemd/techpulse-refresh.service /etc/systemd/system/
sudo cp deploy/systemd/techpulse-refresh.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now techpulse-refresh.timer
sudo systemctl start techpulse-refresh.service

systemctl status techpulse-refresh.service --no-pager
systemctl list-timers techpulse-refresh.timer --no-pager
journalctl -u techpulse-refresh.service -n 100 --no-pager
```

## Nginx Proxy Manager / FRP

No public-domain change is required if the existing proxy already forwards `techpulse.attodigitalhk.com` to the VM on port `8103`.

After migration, verify:

```bash
curl -I http://127.0.0.1:8103/health.json
curl -I https://techpulse.attodigitalhk.com/health.json
```

## Rollback

If migration fails before the public proxy is changed, restart the old combined service:

```bash
cd /opt/globalpilot
docker compose -f compose.techpulse.yml --env-file .env.production up -d
sudo cp deploy/systemd/techpulse-refresh.service /etc/systemd/system/
sudo cp deploy/systemd/techpulse-refresh.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now techpulse-refresh.timer
```
