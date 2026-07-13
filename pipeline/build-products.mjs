import fs from "node:fs";

const seedsPath = process.argv[2] || "pipeline/product-seeds.json";
const siteDataPath = process.argv[3] || "data.generated.js";
const outPath = process.argv[4] || "product-data.generated.js";
const signalsPath = process.argv[5] || "pipeline/product-signals.real.json";

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function readSiteData(path) {
  if (!fs.existsSync(path)) return { videos: [], generatedAt: new Date().toISOString() };
  const source = fs.readFileSync(path, "utf8");
  const match = source.match(/window\.TechPulseData\s*=\s*({[\s\S]*?});\s*\n\s*window\.TechPulseUtils/);
  if (!match) throw new Error(`Unable to parse TechPulse data from ${path}`);
  return JSON.parse(match[1]);
}

function scoreVideo(video) {
  return Math.round((Number(video.views || 0) + Number(video.likes || 0) * 5 + Number(video.comments || 0) * 10) / Math.pow(Number(video.publishedHours || 12) + 2, 1.65));
}

function matchVideos(seed, videos) {
  const genericTerms = new Set(["ai", "llm", "agent", "agents", "tool", "tools", "coding", "developer", "github", "open source"]);
  const identityTerms = seed.discovered
    ? [seed.name, seed.id, ...(seed.githubRepos || []).map((repo) => repo.split("/").pop())]
    : seed.keywords;
  const keywords = [...new Set(identityTerms
    .map((keyword) => String(keyword || "").toLowerCase().trim())
    .filter((keyword) => keyword.length >= 4 && !genericTerms.has(keyword)))];
  return videos
    .map((video) => {
      const haystack = `${video.topic} ${video.summary} ${(video.tags || []).join(" ")} ${video.channel}`.toLowerCase();
      const matches = keywords.filter((keyword) => haystack.includes(keyword));
      return { ...video, matches, score: scoreVideo(video) };
    })
    .filter((video) => video.matches.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function fallbackVideoProof(seed, videos) {
  const categoryMatch = videos.filter((video) => video.category === "AI" || video.category === seed.category).slice(0, 2);
  return categoryMatch.length ? categoryMatch : videos.slice(0, 2);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function signalFor(signals, seed) {
  return (signals.products || []).find((product) => product.id === seed.id) || {};
}

function dynamicGithubWeight(seed, signal) {
  const stars = Number(signal.github?.stars || 0);
  const repoCount = Number(signal.github?.repoCount || 0);
  const boost = stars ? Math.min(8, Math.round(Math.log10(stars + 1) * 2)) : 0;
  const repoBoost = repoCount > 1 ? 2 : repoCount === 1 ? 1 : 0;
  return clamp(seed.githubWeight + boost + repoBoost, 5, 38);
}

function dynamicCommunityWeight(seed, signal) {
  const hnComments = Number(signal.hackerNews?.comments || 0);
  const hnPoints = Number(signal.hackerNews?.points || 0);
  const boost = Math.min(10, Math.round((hnComments + hnPoints / 5) / 12));
  return clamp(seed.communityWeight + boost, 5, 36);
}

function sourceDigest(seed, signal) {
  const github = signal.github || {};
  const hackerNews = signal.hackerNews || {};
  return {
    github: {
      status: github.status || "seed",
      repoCount: github.repoCount || 0,
      stars: github.stars || 0,
      forks: github.forks || 0,
      topRepo: github.topRepo || null,
      repos: github.repos || [],
      detail: github.repoCount
        ? `${github.repoCount} 个相关仓库，累计 ${github.stars || 0} stars。`
        : seed.githubDetail,
    },
    hackerNews: {
      status: hackerNews.status || "seed",
      matches: hackerNews.matches || 0,
      points: hackerNews.points || 0,
      comments: hackerNews.comments || 0,
      topStories: hackerNews.topStories || [],
      detail: hackerNews.matches
        ? `${hackerNews.matches} 条 HN 讨论，累计 ${hackerNews.comments || 0} 条评论。`
        : seed.communityDetail,
    },
  };
}

function buildProduct(seed, videos, signal) {
  const matched = matchVideos(seed, videos);
  const proofVideos = matched.length ? matched : seed.discovered ? [] : fallbackVideoProof(seed, videos);
  const videoBuzzRaw = proofVideos.reduce((sum, video) => sum + scoreVideo(video), 0);
  const videoWeight = proofVideos.length ? clamp(Math.round(videoBuzzRaw / 1200), 12, 35) : 0;
  const freshnessBoost = proofVideos.some((video) => Number(video.publishedHours || 99) <= 24) ? 8 : 3;
  const githubWeight = dynamicGithubWeight(seed, signal);
  const communityWeight = dynamicCommunityWeight(seed, signal);
  const sourceSignals = sourceDigest(seed, signal);
  const signalScore = clamp(githubWeight + communityWeight + videoWeight + seed.freshnessWeight + freshnessBoost, 45, 98);
  const trend = signalScore >= 88 ? "+18" : signalScore >= 80 ? "+11" : "+6";
  const videoIds = proofVideos.map((video) => video.videoId).filter(Boolean);

  return {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    tagline: seed.tagline,
    signalScore,
    signalTrend: trend,
    sourceMix: {
      github: githubWeight,
      community: communityWeight,
      video: videoWeight,
      freshness: seed.freshnessWeight,
    },
    evidence: [
      githubWeight >= 25 ? "GitHub 生态强" : "生态信号待跟踪",
      communityWeight >= 25 ? "社区讨论活跃" : "社区观点持续采样",
      videoIds.length ? `${videoIds.length} 条视频证明` : "等待视频证明",
    ],
    quickTake: seed.quickTake,
    bestFor: seed.bestFor,
    notFor: seed.notFor,
    risks: seed.risks,
    github: { label: "技术生态", value: githubWeight >= 25 ? "强信号" : "观察中", detail: sourceSignals.github.detail },
    community: { label: "社区观点", value: communityWeight >= 25 ? "高讨论" : "持续采样", detail: sourceSignals.hackerNews.detail },
    sourceSignals,
    videos: videoIds,
    keywords: seed.keywords,
  };
}

const seeds = readJson(seedsPath, []);
const siteData = readSiteData(siteDataPath);
const signals = readJson(signalsPath, { products: [] });
const products = seeds.map((seed) => buildProduct(seed, siteData.videos || [], signalFor(signals, seed))).sort((a, b) => b.signalScore - a.signalScore);

const js = `window.TechPulseProducts = ${JSON.stringify(
  {
    generatedAt: siteData.generatedAt || new Date().toISOString(),
    signalGeneratedAt: signals.generatedAt || null,
    products,
  },
  null,
  2
)};
`;

fs.writeFileSync(outPath, js);
console.log(`Built ${products.length} products -> ${outPath}`);
