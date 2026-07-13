import fs from "node:fs";

const inputPath = process.argv[2] || "pipeline/candidates.sample.json";
const gravity = Number(process.env.GRAVITY || 1.65);

function scoreVideo(video) {
  const engagement = video.views + 5 * video.likes + 10 * video.comments;
  const decay = Math.pow(video.publishedHours + 2, gravity);
  return Math.round((engagement / decay) * (video.channelWeight || 1));
}

const candidates = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const ranked = candidates
  .map((video) => ({
    ...video,
    score: scoreVideo(video),
  }))
  .sort((a, b) => b.score - a.score);

console.log(JSON.stringify(ranked, null, 2));
