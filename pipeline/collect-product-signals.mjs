import fs from "node:fs";

const seedsPath = process.argv[2] || "pipeline/product-seeds.json";
const outPath = process.argv[3] || "pipeline/product-signals.real.json";
const timeoutMs = Number(process.env.PRODUCT_SIGNAL_TIMEOUT_MS || 8000);
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ""));
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "TechPulseBot/0.1",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function githubRepoSignal(repo) {
  try {
    const data = await fetchJson(`https://api.github.com/repos/${repo}`, {
      headers: githubToken ? { Authorization: `Bearer ${githubToken}` } : {},
    });
    return {
      repo,
      name: data.full_name,
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      openIssues: data.open_issues_count || 0,
      pushedAt: data.pushed_at,
      description: data.description || "",
      url: data.html_url,
    };
  } catch (error) {
    return { repo, error: error.message };
  }
}

async function githubSearchSignal(seed) {
  const query = encodeURIComponent(`${seed.name} ${seed.keywords?.slice(0, 2).join(" ") || ""} in:name,description`);
  try {
    const data = await fetchJson(`https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=3`, {
      headers: githubToken ? { Authorization: `Bearer ${githubToken}` } : {},
    });
    return (data.items || []).map((item) => ({
      repo: item.full_name,
      name: item.full_name,
      stars: item.stargazers_count || 0,
      forks: item.forks_count || 0,
      openIssues: item.open_issues_count || 0,
      pushedAt: item.pushed_at,
      description: item.description || "",
      url: item.html_url,
      discoveredBy: "search",
    }));
  } catch (error) {
    return [{ error: error.message, discoveredBy: "search" }];
  }
}

async function collectGithub(seed) {
  const explicitRepos = seed.githubRepos || [];
  const repoSignals = await Promise.all(explicitRepos.map(githubRepoSignal));
  const searchedRepos = explicitRepos.length ? [] : await githubSearchSignal(seed);
  const repos = [...repoSignals, ...searchedRepos].filter((repo) => !repo.error);
  const errors = [...repoSignals, ...searchedRepos].filter((repo) => repo.error).map((repo) => `${repo.repo || repo.discoveredBy}: ${repo.error}`);
  return {
    status: repos.length ? "ok" : errors.length ? "partial" : "empty",
    repoCount: repos.length,
    stars: repos.reduce((sum, repo) => sum + Number(repo.stars || 0), 0),
    forks: repos.reduce((sum, repo) => sum + Number(repo.forks || 0), 0),
    openIssues: repos.reduce((sum, repo) => sum + Number(repo.openIssues || 0), 0),
    topRepo: repos.slice().sort((a, b) => Number(b.stars || 0) - Number(a.stars || 0))[0] || null,
    repos: repos.slice(0, 4),
    errors,
  };
}

async function collectHackerNews(seed) {
  const query = encodeURIComponent(seed.hnQuery || seed.name);
  try {
    const data = await fetchJson(`https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story&hitsPerPage=5`);
    const terms = [...new Set([seed.name, seed.id, ...(seed.keywords || []), ...(seed.githubRepos || []).map((repo) => repo.split("/").pop())]
      .map((term) => String(term || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
      .filter((term) => term.length >= 3))];
    const stories = (data.hits || []).filter((story) => {
      const haystack = `${story.title || story.story_title || ""} ${story.url || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ");
      return terms.some((term) => haystack.includes(term));
    }).map((story) => ({
      title: story.title || story.story_title || "",
      points: story.points || 0,
      comments: story.num_comments || 0,
      createdAt: story.created_at,
      url: story.url || `https://news.ycombinator.com/item?id=${story.objectID}`,
      hnUrl: `https://news.ycombinator.com/item?id=${story.objectID}`,
    }));
    return {
      status: stories.length ? "ok" : "empty",
      matches: stories.length,
      points: stories.reduce((sum, story) => sum + Number(story.points || 0), 0),
      comments: stories.reduce((sum, story) => sum + Number(story.comments || 0), 0),
      topStories: stories,
    };
  } catch (error) {
    return { status: "error", matches: 0, points: 0, comments: 0, topStories: [], error: error.message };
  }
}

async function collectSeed(seed) {
  const [github, hackerNews] = await Promise.all([collectGithub(seed), collectHackerNews(seed)]);
  return compact({
    id: seed.id,
    name: seed.name,
    generatedAt: new Date().toISOString(),
    github,
    hackerNews,
  });
}

const seeds = readJson(seedsPath, []);
const startedAt = new Date().toISOString();
const products = await Promise.all(seeds.map(collectSeed));
const payload = {
  generatedAt: new Date().toISOString(),
  startedAt,
  timeoutMs,
  sources: {
    github: "https://api.github.com",
    hackerNews: "https://hn.algolia.com/api/v1",
  },
  products,
};

fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Collected product signals for ${products.length} products -> ${outPath}`);
