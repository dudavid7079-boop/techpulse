const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const alertsEnabled = process.env.TECHPULSE_ALERTS_ENABLED !== "false";

const kind = process.argv[2] || "test";
const stage = process.argv[3] || "manual-test";
const publicUrl = process.env.TECHPULSE_PUBLIC_URL || "https://techpulse.attodigitalhk.com";
const host = process.env.HOSTNAME || "local";
const timestamp = new Date().toISOString();

function buildMessage() {
  if (kind === "failure") {
    return [
      "TechPulse refresh failed",
      `Stage: ${stage}`,
      `Host: ${host}`,
      `Time: ${timestamp}`,
      "Previous release restored: yes",
      "Check: journalctl -u techpulse-refresh.service -n 120 --no-pager",
    ].join("\n");
  }

  return [
    "TechPulse alert test",
    `Stage: ${stage}`,
    `Host: ${host}`,
    `Time: ${timestamp}`,
    `Site: ${publicUrl}`,
  ].join("\n");
}

async function main() {
  const text = buildMessage();

  if (!alertsEnabled) {
    console.log(text);
    console.log("\nTECHPULSE_ALERTS_ENABLED=false, printed preview only.");
    return;
  }

  if (!botToken || !chatId) {
    console.log(text);
    console.log("\nMissing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID, printed preview only.");
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) throw new Error(`Telegram alert failed: ${res.status} ${await res.text()}`);
  console.log("TechPulse alert sent.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
