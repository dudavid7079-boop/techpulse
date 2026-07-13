import fs from "node:fs";

const baseUrl = normalizeBaseUrl(process.env.INVIDIOUS_BASE_URL || "https://video.techpulse.attodigitalhk.com");
const sampleVideoId = process.env.INVIDIOUS_SAMPLE_VIDEO_ID || "sLYXRA5Ay9g";
const outputPath = process.argv[2] || "pipeline/invidious-status.json";
const startedAt = Date.now();

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function statusPayload(status, message, extra = {}) {
  return {
    status,
    baseUrl,
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    sampleVideoId,
    message,
    ...extra
  };
}

async function fetchJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TechPulse/0.1 Invidious health check"
    },
    signal: AbortSignal.timeout(12000)
  });
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${pathname} returned HTTP ${response.status}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`${pathname} returned ${contentType || "unknown content type"}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${pathname} returned invalid JSON`);
  }
}

try {
  const [stats, video] = await Promise.all([fetchJson("/api/v1/stats"), fetchJson(`/api/v1/videos/${sampleVideoId}`)]);
  if (!video?.videoId && !video?.title) {
    throw new Error("video API response does not include expected video fields");
  }

  const payload = statusPayload("healthy", "Invidious 备用播放线路可用。", {
    software: stats?.software || null,
    version: stats?.version || null,
    sampleTitle: video.title || null
  });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Invidious healthy: ${baseUrl}`);
} catch (error) {
  const payload = statusPayload("unhealthy", error.message);
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.error(`Invidious unhealthy: ${error.message}`);
  process.exitCode = 1;
}
