import fs from "node:fs";

const digestPath = process.argv[2] || "pipeline/daily-digest.sample.json";
const candidatesPath = process.argv[3] || "pipeline/candidates.sample.json";
const channelsPath = process.argv[4] || "pipeline/channels.sample.json";
const outPath = process.argv[5] || "data.generated.js";

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function fallbackChapters(rank) {
  return [
    "00:00 今日话题背景",
    "05:30 关键产品/技术变化",
    "13:20 海外创作者观点",
    "22:00 中文用户需要关注什么",
  ].map((chapter) => chapter.replace("00:", `${String(rank).padStart(2, "0")}:`));
}

const digest = readJson(digestPath, { topics: [] });
const candidates = readJson(candidatesPath, []);
const channels = readJson(channelsPath, []);
const candidateById = new Map(candidates.map((item) => [item.videoId, item]));

const videos = digest.topics.map((topic) => {
  const source = candidateById.get(topic.mainVideoId) || {};
  return {
    videoId: topic.mainVideoId,
    topic: topic.topicZh,
    category: source.category || "AI",
    channel: topic.channel || source.channel || "Unknown Channel",
    publishedHours: source.publishedHours || 12,
    views: source.views || 0,
    likes: source.likes || 0,
    comments: source.comments || 0,
    summary: topic.summaryZh,
    chapters: fallbackChapters(topic.rank),
    related: topic.relatedVideoIds || [],
    tags: [topic.heatLevel, source.category || "AI", "Daily Digest"],
    quality: Math.max(80, 100 - topic.rank),
    status: "ready",
  };
});

const siteChannels = channels.map((channel) => ({
  name: channel.name,
  type: channel.category === "AI" ? "AI 科技先锋" : channel.category === "Review" ? "综合科技评测" : "监控频道",
  description: `${channel.name} 的 RSS 频道，权重 ${channel.weight}。`,
  weight: channel.weight || 1,
  status: "active",
  cadence: "2h",
}));

const js = `window.TechPulseData = ${JSON.stringify(
  {
    gravity: Number(process.env.GRAVITY || 1.65),
    generatedAt: digest.generatedAt || new Date().toISOString(),
    videos,
    channels: siteChannels,
  },
  null,
  2
)};

window.TechPulseUtils = {
  scoreVideo(video) {
    const gravity = window.TechPulseData.gravity;
    return Math.round((video.views + 5 * video.likes + 10 * video.comments) / Math.pow(video.publishedHours + 2, gravity));
  },
  formatNumber(value) {
    if (value >= 1000000) return \`\${(value / 1000000).toFixed(1)}M\`;
    if (value >= 1000) return \`\${Math.round(value / 1000)}K\`;
    return String(value);
  },
};
`;

fs.writeFileSync(outPath, js);
console.log(`Exported ${videos.length} topics -> ${outPath}`);
