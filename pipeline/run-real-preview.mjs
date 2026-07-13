import { spawnSync } from "node:child_process";
import fs from "node:fs";

const recentHours = process.env.RSS_RECENT_HOURS || "168";
const startedAt = new Date().toISOString();

const steps = [
  {
    name: "Video Discovery",
    command: [
    "node",
    ["pipeline/discover-rss.mjs", "pipeline/channels.sample.json", "pipeline/discovered.real.json"],
    { RSS_RECENT_HOURS: recentHours },
    ],
  },
  {
    name: "Metrics Sync",
    command: ["node", ["pipeline/sync-metrics.mjs", "pipeline/discovered.real.json", "pipeline/candidates.real.json"]],
  },
  {
    name: "Topic Ranking",
    command: [
    "node",
    ["pipeline/build-digest.mjs", "pipeline/candidates.real.json", "pipeline/daily-digest.real.json"],
    { CANDIDATE_LIMIT: process.env.CANDIDATE_LIMIT || "40", TOPIC_LIMIT: process.env.TOPIC_LIMIT || "20" },
    ],
  },
  {
    name: "Frontend Export",
    command: [
    "node",
    [
      "pipeline/export-site-data.mjs",
      "pipeline/daily-digest.real.json",
      "pipeline/candidates.real.json",
      "pipeline/channels.sample.json",
      "data.generated.js",
    ],
    ],
  },
  {
    name: "Notification Preview",
    command: ["node", ["pipeline/push-digest.mjs", "pipeline/daily-digest.real.json"]],
  },
];

function writeStatus(status) {
  fs.writeFileSync("pipeline/job-status.json", `${JSON.stringify(status, null, 2)}\n`);
}

function summarizeOutput(text = "") {
  const cleaned = text.trim();
  if (!cleaned) return "Unknown pipeline error";

  const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  const errorLine = lines.find((line) => line.startsWith("Error:"));
  const messageLine = lines.find((line) => line.includes('"message":'));
  if (errorLine && messageLine) return `${errorLine} ${messageLine}`.slice(0, 900);
  if (errorLine || messageLine) return (errorLine || messageLine).slice(0, 900);

  return lines.slice(-4).join(" ").slice(0, 900);
}

const completedSteps = [];

for (const step of steps) {
  const [cmd, args, extraEnv = {}] = step.command;
  const result = spawnSync(cmd, args, {
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    writeStatus({
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      recentHours: Number(recentHours),
      failedStep: step.name,
      exitCode: result.status,
      completedSteps,
      errorSummary: summarizeOutput(result.stderr || result.stdout || result.error?.message || "Unknown pipeline error"),
      command: [cmd, ...args].join(" "),
      mode: process.env.YOUTUBE_API_KEY ? "youtube-api" : "estimated",
    });
    console.error(`Pipeline failed at ${step.name}. Wrote pipeline/job-status.json`);
    process.exit(result.status || 1);
  }

  completedSteps.push(step.name);
}

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const discovered = readJson("pipeline/discovered.real.json", []);
const candidates = readJson("pipeline/candidates.real.json", []);
const digest = readJson("pipeline/daily-digest.real.json", { topics: [] });
const sources = [...new Set(candidates.map((item) => item.source || "unknown"))];

const status = {
  status: "success",
  startedAt,
  finishedAt: new Date().toISOString(),
  recentHours: Number(recentHours),
  mode: sources.includes("youtube-api") ? "youtube-api" : "estimated",
  discoveredCount: discovered.length,
  candidateCount: candidates.length,
  topicCount: digest.topics?.length || 0,
  sources,
  completedSteps,
  topTopics: (digest.topics || []).slice(0, 5).map((topic) => ({
    rank: topic.rank,
    topicZh: topic.topicZh,
    channel: topic.channel,
    score: topic.score,
    mainVideoId: topic.mainVideoId,
  })),
};

writeStatus(status);
console.log("Wrote pipeline/job-status.json");
console.log(`Real preview pipeline complete. Window: ${recentHours}h. Open index.html?source=generated.`);
