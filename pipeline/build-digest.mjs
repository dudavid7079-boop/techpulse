import fs from "node:fs";

const inputPath = process.argv[2] || "pipeline/candidates.sample.json";
const outPath = process.argv[3] || "pipeline/daily-digest.sample.json";
const gravity = Number(process.env.GRAVITY || 1.65);
const candidateLimit = Number(process.env.CANDIDATE_LIMIT || 40);
const topicLimit = Number(process.env.TOPIC_LIMIT || 20);

function scoreVideo(video) {
  const engagement = video.views + 5 * video.likes + 10 * video.comments;
  const decay = Math.pow(video.publishedHours + 2, gravity);
  return Math.round((engagement / decay) * (video.channelWeight || 1));
}

function simpleSummary(video) {
  return `这条来自 ${video.channel} 的视频正在获得较高互动。当前热度分为 ${video.score}，适合进入今日中文快报候选。正式版本会替换为字幕驱动的大模型摘要。`;
}

const candidates = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const ranked = candidates
  .map((video) => ({ ...video, score: scoreVideo(video) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, candidateLimit);

const digest = {
  generatedAt: new Date().toISOString(),
  gravity,
  candidateCount: ranked.length,
  topics: ranked.slice(0, topicLimit).map((video, index) => ({
    rank: index + 1,
    topicZh: video.title,
    heatLevel: index < 3 ? "S" : index < 10 ? "A" : "B",
    mainVideoId: video.videoId,
    relatedVideoIds: [],
    score: video.score,
    channel: video.channel,
    summaryZh: simpleSummary(video),
  })),
};

fs.writeFileSync(outPath, `${JSON.stringify(digest, null, 2)}\n`);
console.log(`Built digest ${digest.topics.length} topics -> ${outPath}`);
