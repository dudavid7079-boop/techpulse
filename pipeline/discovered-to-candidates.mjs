import fs from "node:fs";

const inputPath = process.argv[2] || "pipeline/discovered.real.json";
const outPath = process.argv[3] || "pipeline/candidates.real.json";

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function parseCompactNumber(text = "") {
  const normalized = text.replaceAll(",", "").trim().toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([kmb])?/);
  if (!match) return 0;

  const value = Number(match[1]);
  const suffix = match[2];
  const multipliers = {
    k: 1_000,
    m: 1_000_000,
    b: 1_000_000_000,
  };

  return Math.round(value * (multipliers[suffix] || 1));
}

function parseRelativeAgeHours(text = "") {
  const normalized = text.toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s+(minute|hour|day|week|month|year)s?\s+ago/);
  if (!match) return 24;

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    minute: 1 / 60,
    hour: 1,
    day: 24,
    week: 24 * 7,
    month: 24 * 30,
    year: 24 * 365,
  };

  return Math.max(0.25, value * multipliers[unit]);
}

function hoursSince(iso = "") {
  if (!iso) return null;
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0.25, (Date.now() - timestamp) / 36e5);
}

function estimateViews(item, publishedHours) {
  const baseByCategory = {
    AI: 28_000,
    Platform: 18_000,
    Review: 120_000,
    Devices: 90_000,
  };
  const base = baseByCategory[item.category] || 24_000;
  const weight = item.channelWeight || 1;
  const recencyLift = Math.max(0.35, Math.min(2.2, 48 / Math.max(6, publishedHours)));
  return Math.round(base * weight * recencyLift);
}

function estimateEngagement(views, channelWeight) {
  const likeRate = channelWeight >= 1.2 ? 0.038 : 0.028;
  const commentRate = channelWeight >= 1.2 ? 0.0028 : 0.0018;

  return {
    likes: Math.round(views * likeRate),
    comments: Math.round(views * commentRate),
  };
}

const discovered = readJson(inputPath, []);
const candidates = discovered
  .map((item) => {
    const publishedHours = hoursSince(item.publishedAt) || parseRelativeAgeHours(item.publishedText);
    const parsedViews = parseCompactNumber(item.viewText);
    const views = parsedViews || estimateViews(item, publishedHours);
    const channelWeight = item.channelWeight || 1;
    const engagement = estimateEngagement(views, channelWeight);

    return {
      videoId: item.videoId,
      title: item.title,
      channel: item.channel,
      category: item.category,
      publishedAt: item.publishedAt || "",
      publishedHours,
      views,
      likes: engagement.likes,
      comments: engagement.comments,
      channelWeight,
      url: item.url,
      source: parsedViews ? `${item.source || "unknown"}-estimated` : `${item.source || "unknown"}-baseline-estimated`,
      publishedText: item.publishedText || "",
      viewText: item.viewText || "",
    };
  })
  .filter((item) => item.videoId && item.title)
  .sort((a, b) => b.views - a.views);

fs.writeFileSync(outPath, `${JSON.stringify(candidates, null, 2)}\n`);
console.log(`Converted ${candidates.length} discovered videos -> ${outPath}`);
