import fs from "node:fs";

const seedsPath = process.argv[2] || "pipeline/product-seeds.json";
const outPath = process.argv[3] || "pipeline/product-seeds.generated.json";
const limit = Number(process.env.PRODUCT_DISCOVERY_LIMIT || 20);
const automaticLimit = Number(process.env.PRODUCT_DISCOVERY_AUTOMATIC_LIMIT || 10);
const minAutomatic = Number(process.env.PRODUCT_DISCOVERY_MIN_AUTOMATIC || Math.min(3, automaticLimit));
const minQualityScore = Number(process.env.PRODUCT_DISCOVERY_MIN_QUALITY || 45);
const minStars = Number(process.env.PRODUCT_DISCOVERY_MIN_STARS || 100);
const lookbackDays = Number(process.env.PRODUCT_DISCOVERY_LOOKBACK_DAYS || 21);
const timeoutMs = Number(process.env.PRODUCT_SIGNAL_TIMEOUT_MS || 8000);
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const hardExcludePattern = /\b(awesome|tutorial|course|curriculum|beginners?|from scratch|roadmap|interview|book|cheatsheet|papers|learning resources|security training|system prompts|resource list|collection of|prompt collection|deepfake|face swap|penetration testing|red team|exploit|malware|jailbreak|laziest|whimsy|reddit community ninjas?)\b/i;
const weakSignalPattern = /\b(template|boilerplate|demo|example|starter|toy|sample|plugin list|theme|wallpaper|landing page)\b/i;
const genericInfraPattern = /\b(api gateway|gateway|kubernetes|database|proxy|monitoring|observability|logging|load balancer|message queue)\b/i;
const aiPattern = /\b(ai|artificial intelligence|llm|large language model|agent|agents|agentic|rag|retrieval|inference|copilot|mcp|model context|genai|generative|machine learning|ml|neural)\b/i;
const productPattern = /\b(app|platform|agent|assistant|ide|copilot|workflow|builder|search|studio|browser|runtime|cli|protocol|server|sdk|automation|orchestration)\b/i;

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TechPulseBot/0.2", Accept: "application/json", ...headers },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

function title(value) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayNameFor(value) {
  const key = slug(value);
  const knownNames = {
    autogpt: "AutoGPT",
    "browser-use": "Browser Use",
    "gemini-cli": "Gemini CLI",
    llamafactory: "LlamaFactory",
    lobehub: "LobeHub",
    openbb: "OpenBB",
    ragflow: "RAGFlow",
  };
  return knownNames[key] || title(value);
}

function categoryFor(repo) {
  const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (/code|coding|developer|ide/.test(text)) return "AI Coding";
  if (/agent|mcp|tool/.test(text)) return "AI Agent";
  if (/search|rag|retrieval/.test(text)) return "AI Search";
  if (/image|video|audio|voice/.test(text)) return "Generative Media";
  return "AI Infra";
}

function qualityFor(repo, hn = null) {
  const text = `${repo.name || ""} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  const stars = Number(repo.stargazers_count || repo.stars || 0);
  let score = 0;
  const reasons = [];

  if (hardExcludePattern.test(text)) return { score: 0, tier: "blocked", reasons: ["hard-excluded"] };
  if (aiPattern.test(text)) {
    score += 25;
    reasons.push("ai-signal");
  }
  if (productPattern.test(text)) {
    score += 16;
    reasons.push("product-shape");
  }
  if (hn) {
    score += 18;
    reasons.push("hn-discussion");
  }
  if (!repo.fork && !repo.archived) score += 10;
  if (repo.homepage) score += 6;
  if (repo.description && repo.description.length >= 36 && repo.description.length <= 260) score += 8;
  score += Math.min(14, Math.round(Math.log10(stars + 1) * 3));

  if (weakSignalPattern.test(text)) score -= 18;
  if (genericInfraPattern.test(text)) score -= aiPattern.test(text) ? 18 : 35;
  if (!aiPattern.test(text) && !hn) score -= 28;

  const tier = score >= 72 ? "strong" : score >= 55 ? "watch" : score >= minQualityScore ? "thin" : "reject";
  return { score, tier, reasons };
}

function seedFromRepo(repo, hn = null, quality = qualityFor(repo, hn)) {
  const repoName = repo.full_name || repo.repo;
  const shortName = repo.name || repoName.split("/").pop();
  const displayName = displayNameFor(shortName);
  const topics = (repo.topics || []).slice(0, 4);
  const stars = Number(repo.stargazers_count || repo.stars || 0);
  return {
    id: slug(shortName),
    name: displayName,
    category: categoryFor(repo),
    tagline: repo.description || `${displayName} 是近期 GitHub 与 Hacker News 出现的新 AI 项目。`,
    keywords: [...new Set([shortName, displayName, repo.owner?.login, ...topics].filter(Boolean))].slice(0, 7),
    githubRepos: [repoName],
    hnQuery: hn?.title || displayName,
    githubWeight: Math.min(30, 12 + Math.round(Math.log10(stars + 1) * 4)),
    communityWeight: hn ? 22 : 14,
    freshnessWeight: 10,
    quickTake: `${displayName} 近期在开源社区出现增长信号，适合结合仓库活跃度、实际使用门槛和社区反馈继续观察。`,
    bestFor: ["AI 产品研究", "开发者工具评估", "早期技术选型"],
    notFor: ["未经验证直接用于关键生产系统", "缺少技术评估能力的团队"],
    risks: ["项目成熟度", "维护持续性", "实际采用率仍需验证"],
    githubDetail: `${repoName} 当前约 ${stars} stars。`,
    communityDetail: hn ? `Hacker News 出现相关讨论：${hn.title}` : "等待更多 Hacker News 讨论验证。",
    qualityScore: quality.score,
    qualityTier: quality.tier,
    qualityReasons: quality.reasons,
    discovered: true,
  };
}

function repoFromGithubUrl(url) {
  const match = String(url || "").match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
  return match ? `${match[1]}/${match[2].replace(/\.git$/, "")}` : null;
}

function isProductRepo(repo, hn) {
  const text = `${repo.name || ""} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (!repo.description && !hn) return false;
  if (repo.fork || repo.archived) return false;
  if (hardExcludePattern.test(text)) return false;
  return qualityFor(repo, hn).score >= minQualityScore;
}

const cutoff = new Date(Date.now() - lookbackDays * 86400000);
const date = cutoff.toISOString().slice(0, 10);
const auth = githubToken ? { Authorization: `Bearer ${githubToken}` } : {};
const queries = [
  `topic:artificial-intelligence stars:>=${minStars} pushed:>=${date}`,
  `AI agent in:name,description stars:>=${minStars} pushed:>=${date}`,
  `LLM in:name,description stars:>=${minStars} pushed:>=${date}`,
];

const manualSeeds = readJson(seedsPath, []);
let githubItems = [];
let hnStories = [];
const errors = [];

try {
  const results = await Promise.all(queries.map((query) => fetchJson(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=15`,
    auth,
  )));
  githubItems = results.flatMap((result) => result.items || []);
} catch (error) {
  errors.push(`GitHub discovery: ${error.message}`);
}

try {
  const after = Math.floor(cutoff.getTime() / 1000);
  const data = await fetchJson(`https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=50&numericFilters=created_at_i>${after}`);
  hnStories = data.hits || [];
} catch (error) {
  errors.push(`HN discovery: ${error.message}`);
}

const repoMap = new Map();
for (const repo of githubItems) repoMap.set(repo.full_name.toLowerCase(), { repo, hn: null });
for (const story of hnStories) {
  const repoName = repoFromGithubUrl(story.url);
  if (!repoName) continue;
  const key = repoName.toLowerCase();
  if (repoMap.has(key)) repoMap.get(key).hn = story;
  else repoMap.set(key, { repo: { full_name: repoName, name: repoName.split("/").pop(), description: story.title, stargazers_count: 0 }, hn: story });
}

const manualNames = new Set(manualSeeds.flatMap((seed) => [seed.id, seed.name, ...(seed.githubRepos || [])].map((item) => slug(item))));
const discovered = [...repoMap.values()]
  .filter(({ repo, hn }) => isProductRepo(repo, hn))
  .map(({ repo, hn }) => seedFromRepo(repo, hn, qualityFor(repo, hn)))
  .filter((seed) => !manualNames.has(slug(seed.id)) && !(seed.githubRepos || []).some((repo) => manualNames.has(slug(repo))))
  .sort((a, b) => {
    const scoreDelta = (b.qualityScore || 0) - (a.qualityScore || 0);
    if (scoreDelta) return scoreDelta;
    return b.githubWeight + b.communityWeight - (a.githubWeight + a.communityWeight);
  })
  .slice(0, automaticLimit);

if (errors.length && discovered.length < minAutomatic) {
  console.error(`Product discovery found only ${discovered.length} automatic products; keeping previous release.`);
  console.error(errors.join("\n"));
  process.exit(1);
}

const seeds = [...manualSeeds, ...discovered].slice(0, Math.max(manualSeeds.length, limit));
fs.writeFileSync(outPath, `${JSON.stringify(seeds, null, 2)}\n`);
console.log(`Discovered ${seeds.length - manualSeeds.length} products; ${seeds.length} total -> ${outPath}`);
if (errors.length) console.warn(errors.join("\n"));
