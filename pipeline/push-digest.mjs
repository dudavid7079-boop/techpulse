import fs from "node:fs";

const digestPath = process.argv[2] || "pipeline/daily-digest.sample.json";
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

function buildMessage(digest) {
  const lines = [
    "TechPulse 科技脉动 今日海外科技 & AI 热榜",
    `生成时间：${digest.generatedAt}`,
    "",
    ...digest.topics.slice(0, 10).map((topic) => `${topic.rank}. [${topic.heatLevel}] ${topic.topicZh} (${topic.score})`),
  ];
  return lines.join("\n");
}

async function main() {
  const digest = JSON.parse(fs.readFileSync(digestPath, "utf8"));
  const text = buildMessage(digest);

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

  if (!res.ok) throw new Error(`Telegram failed: ${res.status} ${await res.text()}`);
  console.log("Digest pushed to Telegram.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
