import fs from "node:fs";

const inputPath = process.argv[2] || "pipeline/discovered.sample.json";
const outPath = process.argv[3] || "pipeline/candidates.enriched.json";
const apiKey = process.env.YOUTUBE_API_KEY;
const fallbackMode = process.env.SYNC_FALLBACK_MODE || "estimate";

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function hoursSince(iso) {
  if (!iso) return 24;
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return 24;
  return Math.max(0.25, (Date.now() - timestamp) / 36e5);
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

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    minute: 1 / 60,
    hour: 1,
    day: 24,
    week: 24 * 7,
    month: 24 * 30,
    year: 24 * 365,
  };

  return Math.max(0.25, amount * multipliers[unit]);
}

function estimateViews(video, publishedHours) {
  const baseByCategory = {
    AI: 28_000,
    Platform: 18_000,
    Review: 120_000,
    Devices: 90_000,
  };
  const base = baseByCategory[video.category] || 24_000;
  const weight = video.channelWeight || 1;
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

function fallbackCandidate(video) {
  const publishedHours = video.publishedAt ? hoursSince(video.publishedAt) : parseRelativeAgeHours(video.publishedText);
  const parsedViews = parseCompactNumber(video.viewText);
  const views = parsedViews || estimateViews(video, publishedHours);
  const engagement = estimateEngagement(views, video.channelWeight || 1);

  return {
    ...video,
    publishedAt: video.publishedAt || "",
    publishedHours,
    views,
    likes: engagement.likes,
    comments: engagement.comments,
    source: parsedViews ? `${video.source || "unknown"}-estimated` : `${video.source || "unknown"}-baseline-estimated`,
    syncedAt: new Date().toISOString(),
  };
}

async function fetchMetrics(ids) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API failed: ${res.status} ${await res.text()}`);
  return (await res.json()).items || [];
}

async function main() {
  const discovered = readJson(inputPath, []);
  const byId = new Map(discovered.map((item) => [item.videoId, item]));

  if (!apiKey) {
    if (fallbackMode === "error") {
      throw new Error("Missing YOUTUBE_API_KEY. Set SYNC_FALLBACK_MODE=estimate to allow preview estimates.");
    }

    const estimated = [...byId.values()]
      .map(fallbackCandidate)
      .filter((item) => item.videoId && item.title)
      .sort((a, b) => b.views - a.views);
    fs.writeFileSync(outPath, `${JSON.stringify(estimated, null, 2)}\n`);
    console.log(`Estimated ${estimated.length} videos without YOUTUBE_API_KEY -> ${outPath}`);
    return;
  }

  const enriched = [];

  for (const ids of chunk([...byId.keys()], 50)) {
    const items = await fetchMetrics(ids);
    for (const item of items) {
      const base = byId.get(item.id);
      const stats = item.statistics || {};
      enriched.push({
        ...base,
        title: item.snippet?.title || base.title,
        description: item.snippet?.description || "",
        publishedAt: item.snippet?.publishedAt || base.publishedAt,
        publishedHours: hoursSince(item.snippet?.publishedAt || base.publishedAt),
        views: Number(stats.viewCount || 0),
        likes: Number(stats.likeCount || 0),
        comments: Number(stats.commentCount || 0),
        source: "youtube-api",
        syncedAt: new Date().toISOString(),
      });
    }
  }

  enriched.sort((a, b) => b.views - a.views);
  fs.writeFileSync(outPath, `${JSON.stringify(enriched, null, 2)}\n`);
  console.log(`Synced ${enriched.length} videos -> ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
