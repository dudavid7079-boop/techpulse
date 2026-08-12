import fs from "node:fs";
import path from "node:path";

const site = "https://techpulse.attodigitalhk.com";
const root = process.cwd();
const productDataPath = path.join(root, "product-data.generated.js");
const siteDataPath = path.join(root, "data.generated.js");
const productsDir = path.join(root, "products");
const topicsDir = path.join(root, "topics");

function readWindowJson(filePath, globalName, suffixPattern = /;\s*$/) {
  const source = fs.readFileSync(filePath, "utf8");
  const prefix = `window.${globalName} = `;
  const start = source.indexOf(prefix);
  if (start === -1) throw new Error(`Unable to find ${globalName} in ${filePath}`);
  const after = source.slice(start + prefix.length);
  const end = globalName === "TechPulseData" ? after.indexOf(";\n\nwindow.TechPulseUtils") : after.lastIndexOf(";");
  const json = (end === -1 ? after : after.slice(0, end)).trim().replace(suffixPattern, "");
  return JSON.parse(json);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

function escapeAttr(value) {
  return escapeHTML(value).replace(/`/g, "&#96;");
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function stripEmoji(value) {
  return String(value || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
}

function truncate(value, length = 155) {
  const clean = stripEmoji(String(value || "").replace(/\s+/g, " "));
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
}

function layout({ title, description, canonical, body, jsonLd, lang = "zh-CN" }) {
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHTML(title)}</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <link rel="icon" href="../assets/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" href="../assets/favicon.png" />
    <link rel="apple-touch-icon" href="../assets/apple-touch-icon.png" />
    <link rel="manifest" href="../site.webmanifest" />
    <meta name="theme-color" content="#1769ff" />
    <meta property="og:title" content="${escapeAttr(title)}" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:site_name" content="TechPulse 科技脉动" />
    <meta property="og:image" content="${site}/assets/og-image.png" />
    <meta property="og:url" content="${canonical}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(title)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />
    <meta name="twitter:image" content="${site}/assets/og-image.png" />
    <link rel="canonical" href="${canonical}" />
    <link rel="stylesheet" href="../styles.css?v=20260811-seo-article" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body class="seo-detail-page">
    <header class="site-header">
      <a class="brand" href="../index.html" aria-label="TechPulse 首页"><img class="brand-logo" src="../assets/logo-mark.png" width="62" height="42" decoding="async" alt="" /><span class="brand-text"><strong>TechPulse</strong><small>科技脉动</small></span></a>
      <nav aria-label="主导航">
        <a href="../index.html#products">产品雷达</a>
        <a href="../index.html#hot">视频热榜</a>
        <a href="../search.html">搜索</a>
        <a href="../channels.html">来源</a>
        <a href="../pricing.html">会员</a>
        <a class="nav-cta" href="../subscribe.html">订阅</a>
      </nav>
    </header>
    <main>${body}</main>
    <footer class="site-footer"><span>TechPulse · 科技脉动</span><span>AI 产品情报</span></footer>
    <script src="../i18n.js?v=20260810-bilingual"></script>
  </body>
</html>
`;
}

function repoList(product) {
  const repos = product.sourceSignals?.github?.repos || [];
  if (!repos.length) return "<p>暂无可展示仓库，等待下一次数据刷新。</p>";
  return `<ul>${repos.slice(0, 5).map((repo) => `<li><a href="${escapeAttr(repo.url || `https://github.com/${repo.repo}`)}" rel="nofollow noopener" target="_blank">${escapeHTML(repo.name || repo.repo)}</a> · ${escapeHTML(repo.stars || 0)} stars · ${escapeHTML(repo.forks || 0)} forks<br /><span>${escapeHTML(repo.description || "暂无仓库描述。")}</span></li>`).join("")}</ul>`;
}

function hnList(product) {
  const stories = product.sourceSignals?.hackerNews?.topStories || [];
  if (!stories.length) return "<p>暂无 Hacker News 高相关讨论，等待下一次数据刷新。</p>";
  return `<ul>${stories.slice(0, 5).map((story) => `<li><a href="${escapeAttr(story.url)}" rel="nofollow noopener" target="_blank">${escapeHTML(story.title)}</a> · ${escapeHTML(story.points || 0)} points · ${escapeHTML(story.comments || 0)} comments</li>`).join("")}</ul>`;
}

function matchedVideoList(product, videos) {
  const ids = new Set(product.videos || []);
  const matched = videos.filter((video) => ids.has(video.videoId));
  if (!matched.length) return "<p>暂无直接匹配视频证明，后续刷新会继续采样海外评测和演示内容。</p>";
  return `<ul>${matched.map((video) => `<li><a href="../topics/${slug(video.videoId || video.topic)}.html">${escapeHTML(video.topic)}</a> · ${escapeHTML(video.channel)} · ${escapeHTML(video.category)}<br /><span>${escapeHTML(truncate(video.summary, 220))}</span></li>`).join("")}</ul>`;
}

function productPage(product, data) {
  const canonical = `${site}/products/${slug(product.id || product.name)}.html`;
  const title = `${product.name} 是什么？GitHub、HN 与视频信号 - TechPulse`;
  const description = truncate(`${product.name}：${product.tagline || product.quickTake || product.evidence?.join("，")} TechPulse 汇总 GitHub、Hacker News 和海外视频摘要。`);
  const body = `
      <section class="page-hero product-hero">
        <div class="product-hero-copy">
          <span class="section-label">AI Product Brief</span>
          <h1>${escapeHTML(product.name)} 是什么？</h1>
          <p>${escapeHTML(product.quickTake || product.tagline || "TechPulse 正在汇总该产品的技术生态、社区讨论和视频证明。")}</p>
        </div>
        <aside class="product-hero-panel">
          <span>Signal Score</span>
          <strong>${escapeHTML(product.signalScore || 0)}</strong>
          <p>${escapeHTML((product.evidence || []).join(" · "))}</p>
        </aside>
      </section>
      <section class="product-workbench seo-article">
        <article class="product-detail">
          <section class="quick-take">
            <h2>3 秒看懂</h2>
            <p>${escapeHTML(product.quickTake || product.tagline || "暂无简述。")}</p>
            <div class="product-tags">${(product.evidence || []).map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div>
          </section>
          <section class="signal-mix">
            <article><span>GitHub</span><b>${escapeHTML(product.sourceMix?.github || 0)}%</b><p>${escapeHTML(product.github?.detail || product.sourceSignals?.github?.detail || "持续采样中。")}</p></article>
            <article><span>社区讨论</span><b>${escapeHTML(product.sourceMix?.community || 0)}%</b><p>${escapeHTML(product.community?.detail || product.sourceSignals?.hackerNews?.detail || "持续采样中。")}</p></article>
            <article><span>视频证明</span><b>${escapeHTML(product.sourceMix?.video || 0)}%</b><p>海外视频摘要用于判断产品是否有真实演示和使用场景。</p></article>
            <article><span>新鲜度</span><b>${escapeHTML(product.sourceMix?.freshness || 0)}%</b><p>根据最近新增仓库、讨论和视频信号加权。</p></article>
          </section>
          <section class="source-evidence"><article><h2>GitHub 源码生态</h2>${repoList(product)}</article><article><h2>Hacker News / 社区讨论</h2>${hnList(product)}</article></section>
          <section class="source-evidence"><article><h2>海外视频证明</h2>${matchedVideoList(product, data.videos || [])}</article><article><h2>适合谁 / 不适合谁</h2><p><strong>适合：</strong>${escapeHTML(product.bestFor || "需要跟踪 AI 产品变化的中文用户。")}</p><p><strong>不适合：</strong>${escapeHTML(product.notFor || "需要官方采购建议或法律合规意见的场景。")}</p><p><strong>风险：</strong>${escapeHTML(product.risks || "仍需结合官方文档与实际测试验证。")}</p></article></section>
          <section class="source-evidence"><article><h2>常见问题</h2><h3>${escapeHTML(product.name)} 值得关注吗？</h3><p>当前信号分为 ${escapeHTML(product.signalScore || 0)}，TechPulse 会综合 GitHub、Hacker News、视频证明和新鲜度判断是否值得跟进。</p><h3>TechPulse 如何生成这个档案？</h3><p>系统每天抓取公开来源，按产品实体对齐 GitHub 仓库、社区讨论和海外视频摘要，再生成中文情报卡。</p></article></section>
        </article>
      </section>`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: canonical,
    dateModified: data.generatedAt,
    author: { "@type": "Organization", name: "TechPulse 科技脉动" },
    publisher: { "@type": "Organization", name: "TechPulse 科技脉动", logo: { "@type": "ImageObject", url: `${site}/assets/logo-lockup.png` } },
    about: { "@type": "SoftwareApplication", name: product.name, applicationCategory: product.category || "AI Product" },
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: `${product.name} 是什么？`, acceptedAnswer: { "@type": "Answer", text: product.quickTake || product.tagline || description } },
        { "@type": "Question", name: "TechPulse 如何判断产品信号？", acceptedAnswer: { "@type": "Answer", text: "TechPulse 综合 GitHub、Hacker News、海外视频证明和新鲜度生成信号分。" } }
      ]
    }
  };
  return layout({ title, description, canonical, body, jsonLd });
}

function topicPage(video, data) {
  const id = slug(video.videoId || video.topic);
  const canonical = `${site}/topics/${id}.html`;
  const title = `${video.topic} 中文摘要 - TechPulse`;
  const description = truncate(`${video.channel} 发布的海外科技与 AI 视频摘要：${video.summary}`);
  const youtubeUrl = video.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : undefined;
  const body = `
      <section class="page-hero">
        <span class="section-label">Video Intelligence</span>
        <h1>${escapeHTML(video.topic)}</h1>
        <p>${escapeHTML(video.summary)}</p>
      </section>
      <section class="detail-layout seo-article">
        <article class="topic-detail">
          <div class="topic-detail-head"><div><span class="section-label">${escapeHTML(video.category)}</span><h2>${escapeHTML(video.topic)}</h2><p>${escapeHTML(video.channel)} · ${escapeHTML(video.publishedHours)}h ago</p></div><div class="signal-score"><span>Score</span><b>${escapeHTML(video.score || 0)}</b><small>${escapeHTML(video.heatLevel || "")}</small></div></div>
          <section class="quick-take"><h2>AI 中文快报摘要</h2><p>${escapeHTML(video.summary)}</p><div class="product-tags">${(video.tags || []).map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}</div></section>
          <section class="signal-mix"><article><span>Views</span><b>${escapeHTML(video.views || 0)}</b><p>公开视频观看量。</p></article><article><span>Likes</span><b>${escapeHTML(video.likes || 0)}</b><p>公开视频点赞量。</p></article><article><span>Comments</span><b>${escapeHTML(video.comments || 0)}</b><p>公开视频评论量。</p></article><article><span>Source</span><b>${escapeHTML(video.channel)}</b><p>TechPulse 监控来源。</p></article></section>
          <section class="source-evidence"><article><h2>关键时间点</h2><ul>${(video.timeline || ["01:00 今日话题背景", "05:30 关键产品/技术变化", "13:20 海外创作者观点", "22:00 中文用户需要关注什么"]).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></article><article><h2>原始来源</h2><p>${youtubeUrl ? `<a href="${youtubeUrl}" rel="nofollow noopener" target="_blank">YouTube 原站</a>` : "暂无原站链接。"}</p></article></section>
        </article>
      </section>`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.topic,
    description,
    uploadDate: data.generatedAt,
    embedUrl: video.videoId ? `https://www.youtube-nocookie.com/embed/${video.videoId}` : undefined,
    url: canonical,
    publisher: { "@type": "Organization", name: "TechPulse 科技脉动", logo: { "@type": "ImageObject", url: `${site}/assets/logo-lockup.png` } }
  };
  return layout({ title, description, canonical, body, jsonLd });
}

function writeSitemap(products, videos) {
  const baseUrls = ["/", "/products.html", "/topics.html", "/search.html", "/channels.html", "/subscribe.html", "/pricing.html", "/pipeline.html"];
  const productUrls = products.map((product) => `/products/${slug(product.id || product.name)}.html`);
  const topicUrls = videos.slice(0, 40).map((video) => `/topics/${slug(video.videoId || video.topic)}.html`);
  const urls = [...baseUrls, ...productUrls, ...topicUrls];
  const body = urls.map((url, index) => `  <url>\n    <loc>${site}${url}</loc>\n    <changefreq>${index < 3 ? "daily" : "weekly"}</changefreq>\n    <priority>${index === 0 ? "1.0" : productUrls.includes(url) ? "0.85" : topicUrls.includes(url) ? "0.75" : "0.7"}</priority>\n  </url>`).join("\n");
  fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}

function writeFeed(products, videos, data) {
  const generatedAt = data.generatedAt || new Date().toISOString();
  const items = [
    ...products.slice(0, 20).map((product) => ({
      title: `${product.name} - AI 产品信号 ${product.signalScore || 0}`,
      link: `${site}/products/${slug(product.id || product.name)}.html`,
      description: product.quickTake || product.tagline || (product.evidence || []).join("，"),
      pubDate: generatedAt,
    })),
    ...videos.slice(0, 20).map((video) => ({
      title: `${video.topic} - 中文视频摘要`,
      link: `${site}/topics/${slug(video.videoId || video.topic)}.html`,
      description: video.summary,
      pubDate: generatedAt,
    })),
  ];
  const xmlItems = items
    .map(
      (item) => `    <item>
      <title>${escapeHTML(item.title)}</title>
      <link>${item.link}</link>
      <guid>${item.link}</guid>
      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>
      <description>${escapeHTML(truncate(item.description, 500))}</description>
    </item>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>TechPulse AI 产品与视频情报</title>
    <link>${site}/</link>
    <description>TechPulse 每日 AI 产品雷达、GitHub/HN 信号与海外视频中文摘要。</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date(generatedAt).toUTCString()}</lastBuildDate>
${xmlItems}
  </channel>
</rss>
`;
  fs.writeFileSync(path.join(root, "feed.xml"), xml);
}

function writeProductsJson(products, data) {
  const payload = {
    name: "TechPulse AI Product Intelligence Index",
    generatedAt: data.generatedAt || new Date().toISOString(),
    source: `${site}/products.html`,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      url: `${site}/products/${slug(product.id || product.name)}.html`,
      signalScore: product.signalScore,
      evidence: product.evidence || [],
      quickTake: product.quickTake || product.tagline || "",
      sourceMix: product.sourceMix || {},
      github: product.sourceSignals?.github?.detail || "",
      hackerNews: product.sourceSignals?.hackerNews?.detail || "",
    })),
  };
  fs.writeFileSync(path.join(root, "ai-products.json"), `${JSON.stringify(payload, null, 2)}\n`);
}

function writeLlms(products, videos, data) {
  const lines = [
    "# TechPulse 科技脉动",
    "",
    "TechPulse 是一个面向中文用户的全球 AI 产品雷达和海外科技视频情报站。它聚合 GitHub、Hacker News、公开视频摘要和信号分，帮助用户判断 AI 产品是否值得试用、跟进或研究。",
    "",
    `Last updated: ${data.generatedAt || new Date().toISOString()}`,
    "",
    "## Core pages",
    `- Home: ${site}/`,
    `- Product radar: ${site}/products.html`,
    `- Search: ${site}/search.html`,
    `- Methodology: ${site}/pipeline.html`,
    `- RSS feed: ${site}/feed.xml`,
    `- Machine-readable product index: ${site}/ai-products.json`,
    "",
    "## Product intelligence pages",
    ...products.slice(0, 20).map((product) => `- ${product.name}: ${site}/products/${slug(product.id || product.name)}.html`),
    "",
    "## Video intelligence pages",
    ...videos.slice(0, 20).map((video) => `- ${video.topic}: ${site}/topics/${slug(video.videoId || video.topic)}.html`),
    "",
    "## Data policy",
    "TechPulse summarizes public metadata and links back to original sources. Product and topic pages include timestamps and source evidence for attribution.",
  ];
  fs.writeFileSync(path.join(root, "llms.txt"), `${lines.join("\n")}\n`);
}

fs.mkdirSync(productsDir, { recursive: true });
fs.mkdirSync(topicsDir, { recursive: true });

const productData = readWindowJson(productDataPath, "TechPulseProducts");
const siteData = readWindowJson(siteDataPath, "TechPulseData");
const products = productData.products || [];
const videos = siteData.videos || [];

for (const product of products) {
  fs.writeFileSync(path.join(productsDir, `${slug(product.id || product.name)}.html`), productPage(product, { ...siteData, generatedAt: productData.generatedAt || siteData.generatedAt }));
}

for (const video of videos.slice(0, 40)) {
  fs.writeFileSync(path.join(topicsDir, `${slug(video.videoId || video.topic)}.html`), topicPage(video, siteData));
}

writeSitemap(products, videos);
writeFeed(products, videos, { generatedAt: productData.generatedAt || siteData.generatedAt });
writeProductsJson(products, { generatedAt: productData.generatedAt || siteData.generatedAt });
writeLlms(products, videos, { generatedAt: productData.generatedAt || siteData.generatedAt });
console.log(`Generated ${products.length} product pages, ${Math.min(videos.length, 40)} topic pages, sitemap.xml, feed.xml, ai-products.json, llms.txt`);
