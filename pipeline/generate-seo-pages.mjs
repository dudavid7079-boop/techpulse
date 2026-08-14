import fs from "node:fs";
import path from "node:path";

const site = "https://techpulse.attodigitalhk.com";
const root = process.cwd();
const productDataPath = path.join(root, "product-data.generated.js");
const siteDataPath = path.join(root, "data.generated.js");
const productsDir = path.join(root, "products");
const topicsDir = path.join(root, "topics");
const enDir = path.join(root, "en");
const enProductsDir = path.join(enDir, "products");
const guidesDir = path.join(root, "guides");

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

function productUrl(product, locale = "zh") {
  const file = `${slug(product.id || product.name)}.html`;
  return locale === "en" ? `${site}/en/products/${file}` : `${site}/products/${file}`;
}

function englishProductSummary(product) {
  const repoCount = product.sourceSignals?.github?.repoCount || 0;
  const stars = product.sourceSignals?.github?.stars || 0;
  const hnMatches = product.sourceSignals?.hackerNews?.matches || 0;
  const videoCount = (product.videos || []).length;
  return `${product.name} is an AI product tracked by TechPulse. This profile combines ${repoCount} related GitHub repositories, ${stars} stars, ${hnMatches} Hacker News discussions, and ${videoCount} video proof signals so readers can judge whether it is worth watching.`;
}

function findProduct(products, idOrName) {
  const target = String(idOrName || "").toLowerCase();
  return products.find((product) => String(product.id || "").toLowerCase() === target || String(product.name || "").toLowerCase() === target);
}

function productEvidenceLine(product) {
  const repoCount = product?.sourceSignals?.github?.repoCount || 0;
  const stars = product?.sourceSignals?.github?.stars || 0;
  const hnMatches = product?.sourceSignals?.hackerNews?.matches || 0;
  const comments = product?.sourceSignals?.hackerNews?.comments || 0;
  const videoCount = (product?.videos || []).length;
  return `${repoCount} GitHub repos, ${stars} stars, ${hnMatches} HN discussions, ${comments} comments, ${videoCount} video proof signals`;
}

function altLinks(alternates = []) {
  return alternates.map((item) => `    <link rel="alternate" hreflang="${escapeAttr(item.lang)}" href="${escapeAttr(item.href)}" />`).join("\n");
}

function layout({ title, description, canonical, body, jsonLd, lang = "zh-CN", assetPrefix = "../", navPrefix = "../", alternates = [] }) {
  const alternateBlock = alternates.length ? `\n${altLinks(alternates)}` : "";
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHTML(title)}</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <link rel="icon" href="${assetPrefix}assets/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" href="${assetPrefix}assets/favicon.png" />
    <link rel="apple-touch-icon" href="${assetPrefix}assets/apple-touch-icon.png" />
    <link rel="manifest" href="${assetPrefix}site.webmanifest" />
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
    <meta property="og:url" content="${canonical}" />${alternateBlock}
    <link rel="stylesheet" href="${assetPrefix}styles.css?v=20260814-seo-en" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body class="seo-detail-page">
    <header class="site-header">
      <a class="brand" href="${navPrefix}index.html" aria-label="TechPulse 首页"><img class="brand-logo" src="${assetPrefix}assets/logo-mark.png" width="62" height="42" decoding="async" alt="" /><span class="brand-text"><strong>TechPulse</strong><small>科技脉动</small></span></a>
      <nav aria-label="主导航">
        <a href="${navPrefix}index.html#products">产品雷达</a>
        <a href="${navPrefix}index.html#hot">视频热榜</a>
        <a href="${navPrefix}search.html">搜索</a>
        <a href="${navPrefix}channels.html">来源</a>
        <a href="${navPrefix}pricing.html">会员</a>
        <a class="nav-cta" href="${navPrefix}subscribe.html">订阅</a>
      </nav>
    </header>
    <main>${body}</main>
    <footer class="site-footer"><span>TechPulse · 科技脉动</span><span>AI 产品情报</span></footer>
    <script src="${assetPrefix}i18n.js?v=20260810-bilingual"></script>
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

function matchedVideoList(product, videos, topicPrefix = "../topics") {
  const ids = new Set(product.videos || []);
  const matched = videos.filter((video) => ids.has(video.videoId));
  if (!matched.length) return "<p>暂无直接匹配视频证明，后续刷新会继续采样海外评测和演示内容。</p>";
  return `<ul>${matched.map((video) => `<li><a href="${topicPrefix}/${slug(video.videoId || video.topic)}.html">${escapeHTML(video.topic)}</a> · ${escapeHTML(video.channel)} · ${escapeHTML(video.category)}<br /><span>${escapeHTML(truncate(video.summary, 220))}</span></li>`).join("")}</ul>`;
}

function productPage(product, data) {
  const canonical = productUrl(product, "zh");
  const englishUrl = productUrl(product, "en");
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
  return layout({
    title,
    description,
    canonical,
    body,
    jsonLd,
    alternates: [
      { lang: "zh-CN", href: canonical },
      { lang: "en", href: englishUrl },
      { lang: "x-default", href: canonical },
    ],
  });
}

function productPageEn(product, data) {
  const canonical = productUrl(product, "en");
  const zhUrl = productUrl(product, "zh");
  const title = `What is ${product.name}? GitHub, Hacker News and video signals - TechPulse`;
  const description = truncate(englishProductSummary(product));
  const videoCount = (product.videos || []).length;
  const body = `
      <section class="page-hero product-hero">
        <div class="product-hero-copy">
          <span class="section-label">AI Product Brief</span>
          <h1>What is ${escapeHTML(product.name)}?</h1>
          <p>${escapeHTML(englishProductSummary(product))}</p>
        </div>
        <aside class="product-hero-panel">
          <span>Signal Score</span>
          <strong>${escapeHTML(product.signalScore || 0)}</strong>
          <p>GitHub · Hacker News · ${escapeHTML(videoCount)} video proof signals</p>
        </aside>
      </section>
      <section class="product-workbench seo-article">
        <article class="product-detail">
          <section class="quick-take">
            <h2>Quick take</h2>
            <p>${escapeHTML(englishProductSummary(product))}</p>
            <div class="product-tags"><span>${escapeHTML(product.category || "AI Product")}</span><span>GitHub evidence</span><span>Hacker News discussion</span><span>Video proof</span></div>
          </section>
          <section class="signal-mix">
            <article><span>GitHub</span><b>${escapeHTML(product.sourceMix?.github || 0)}%</b><p>${escapeHTML(product.sourceSignals?.github?.repoCount || 0)} related repositories, ${escapeHTML(product.sourceSignals?.github?.stars || 0)} total stars.</p></article>
            <article><span>Community</span><b>${escapeHTML(product.sourceMix?.community || 0)}%</b><p>${escapeHTML(product.sourceSignals?.hackerNews?.matches || 0)} Hacker News matches, ${escapeHTML(product.sourceSignals?.hackerNews?.comments || 0)} comments.</p></article>
            <article><span>Video proof</span><b>${escapeHTML(product.sourceMix?.video || 0)}%</b><p>Public video summaries help verify demos and real-world usage.</p></article>
            <article><span>Freshness</span><b>${escapeHTML(product.sourceMix?.freshness || 0)}%</b><p>Weighted by recent repositories, discussions, and video signals.</p></article>
          </section>
          <section class="source-evidence"><article><h2>GitHub ecosystem</h2>${repoList(product)}</article><article><h2>Hacker News discussion</h2>${hnList(product)}</article></section>
          <section class="source-evidence"><article><h2>Video proof</h2>${matchedVideoList(product, data.videos || [], "../../topics")}</article><article><h2>Who should track it?</h2><p>TechPulse is useful for founders, developers, product managers, and research teams who need a fast signal on global AI products.</p><p><strong>Risk notes:</strong> Signals are based on public metadata and should be checked against official documentation before adoption.</p></article></section>
          <section class="source-evidence"><article><h2>FAQ</h2><h3>Is ${escapeHTML(product.name)} worth watching?</h3><p>Current signal score: ${escapeHTML(product.signalScore || 0)}. TechPulse combines GitHub, Hacker News, video proof, and freshness signals to decide whether a product deserves attention.</p><h3>How does TechPulse build this profile?</h3><p>The system refreshes public sources daily, aligns them to product entities, and publishes a readable intelligence card with source evidence.</p></article></section>
        </article>
      </section>`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: canonical,
    dateModified: data.generatedAt,
    inLanguage: "en",
    author: { "@type": "Organization", name: "TechPulse" },
    publisher: { "@type": "Organization", name: "TechPulse", logo: { "@type": "ImageObject", url: `${site}/assets/logo-lockup.png` } },
    about: { "@type": "SoftwareApplication", name: product.name, applicationCategory: product.category || "AI Product" },
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: `What is ${product.name}?`, acceptedAnswer: { "@type": "Answer", text: englishProductSummary(product) } },
        { "@type": "Question", name: "How does TechPulse judge product signals?", acceptedAnswer: { "@type": "Answer", text: "TechPulse combines GitHub repositories, Hacker News discussions, video proof, and freshness signals." } }
      ]
    }
  };
  return layout({
    title,
    description,
    canonical,
    body,
    jsonLd,
    lang: "en",
    assetPrefix: "../../",
    navPrefix: "../../",
    alternates: [
      { lang: "en", href: canonical },
      { lang: "zh-CN", href: zhUrl },
      { lang: "x-default", href: zhUrl },
    ],
  });
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

function writeSitemap(products, videos, guideUrls = []) {
  const baseUrls = ["/", "/products.html", "/en/products.html", "/topics.html", "/search.html", "/channels.html", "/subscribe.html", "/pricing.html", "/pipeline.html"];
  const productUrls = products.flatMap((product) => [`/products/${slug(product.id || product.name)}.html`, `/en/products/${slug(product.id || product.name)}.html`]);
  const topicUrls = videos.slice(0, 40).map((video) => `/topics/${slug(video.videoId || video.topic)}.html`);
  const urls = [...baseUrls, ...guideUrls, ...productUrls, ...topicUrls];
  const alternateTags = (url) => {
    if (url === "/products.html") {
      return `\n    <xhtml:link rel="alternate" hreflang="zh-CN" href="${site}/products.html" />\n    <xhtml:link rel="alternate" hreflang="en" href="${site}/en/products.html" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/products.html" />`;
    }
    if (url === "/en/products.html") {
      return `\n    <xhtml:link rel="alternate" hreflang="en" href="${site}/en/products.html" />\n    <xhtml:link rel="alternate" hreflang="zh-CN" href="${site}/products.html" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/products.html" />`;
    }
    const zhMatch = url.match(/^\/products\/(.+\.html)$/);
    const enMatch = url.match(/^\/en\/products\/(.+\.html)$/);
    if (zhMatch || enMatch) {
      const file = zhMatch?.[1] || enMatch?.[1];
      return `\n    <xhtml:link rel="alternate" hreflang="zh-CN" href="${site}/products/${file}" />\n    <xhtml:link rel="alternate" hreflang="en" href="${site}/en/products/${file}" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/products/${file}" />`;
    }
    return "";
  };
  const body = urls.map((url, index) => `  <url>\n    <loc>${site}${url}</loc>${alternateTags(url)}\n    <changefreq>${index < 4 || guideUrls.includes(url) ? "daily" : "weekly"}</changefreq>\n    <priority>${index === 0 ? "1.0" : guideUrls.includes(url) ? "0.9" : productUrls.includes(url) ? "0.85" : topicUrls.includes(url) ? "0.75" : "0.7"}</priority>\n  </url>`).join("\n");
  fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`);
}

function writeEnglishProductIndex(products, data) {
  const generatedAt = data.generatedAt || new Date().toISOString();
  const topProducts = products.slice(0, 20);
  const cards = topProducts.map((product, index) => `
          <article class="product-radar-card">
            <div class="product-rank"><b>${String(index + 1).padStart(2, "0")}</b><span>Signal ${escapeHTML(product.signalScore || 0)}</span></div>
            <div class="product-card-body">
              <div class="product-card-meta"><span>${escapeHTML(product.category || "AI Product")}</span><span>${escapeHTML(product.signalTrend || "+0")} today</span><span>${escapeHTML((product.videos || []).length)} video proofs</span></div>
              <h2>${escapeHTML(product.name)}</h2>
              <p>${escapeHTML(englishProductSummary(product))}</p>
              <div class="product-tags"><span>GitHub evidence</span><span>Hacker News discussion</span><span>Video proof</span></div>
              <div class="product-card-actions">
                <a class="button primary" href="./products/${slug(product.id || product.name)}.html">Read profile</a>
                <a class="button secondary" href="../products/${slug(product.id || product.name)}.html">中文档案</a>
              </div>
            </div>
          </article>`).join("");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "TechPulse AI Product Radar",
    url: `${site}/en/products.html`,
    inLanguage: "en",
    dateModified: generatedAt,
    about: "AI products, GitHub signals, Hacker News discussions, and video proof",
    hasPart: topProducts.map((product) => ({
      "@type": "TechArticle",
      name: `What is ${product.name}?`,
      url: productUrl(product, "en"),
    })),
  };
  const body = `
      <section class="page-hero product-hero">
        <div class="product-hero-copy">
          <span class="section-label">AI Product Radar</span>
          <h1>Track global AI products through GitHub, Hacker News, and video proof.</h1>
          <p>TechPulse turns public engineering signals into readable product intelligence. Use it to decide which AI tools deserve attention, trials, or competitor research.</p>
        </div>
        <aside class="product-hero-panel">
          <span>Live Sources</span>
          <strong>GitHub + HN + Video</strong>
          <p>Updated daily. Product Hunt API is intentionally deferred until the core engineering sources are stable.</p>
        </aside>
      </section>
      <section class="product-signal-strip" aria-label="Radar summary">
        <article><span>Products</span><b>${String(products.length).padStart(2, "0")}</b><p>AI product entities currently tracked.</p></article>
        <article><span>GitHub</span><b>Live</b><p>Repositories, stars, forks, and recent activity.</p></article>
        <article><span>Hacker News</span><b>HN</b><p>Engineer discussions, points, comments, and debates.</p></article>
        <article><span>Video Proof</span><b>Read</b><p>Chinese-readable summaries of public overseas videos.</p></article>
      </section>
      <section class="product-radar-section">
        <span class="section-label">Today's Signal Radar</span>
        <div class="product-radar-grid">${cards}</div>
      </section>`;
  return layout({
    title: "AI Product Radar: GitHub, Hacker News and Video Signals - TechPulse",
    description: "TechPulse tracks global AI products with GitHub repositories, Hacker News discussions, and video proof signals.",
    canonical: `${site}/en/products.html`,
    body,
    jsonLd,
    lang: "en",
    assetPrefix: "../",
    navPrefix: "../",
    alternates: [
      { lang: "en", href: `${site}/en/products.html` },
      { lang: "zh-CN", href: `${site}/products.html` },
      { lang: "x-default", href: `${site}/products.html` },
    ],
  });
}

function guidePage({ slugName, title, description, heroLabel, h1, intro, sections, faq, generatedAt }) {
  const canonical = `${site}/guides/${slugName}.html`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: canonical,
    dateModified: generatedAt,
    inLanguage: "en",
    author: { "@type": "Organization", name: "TechPulse" },
    publisher: { "@type": "Organization", name: "TechPulse", logo: { "@type": "ImageObject", url: `${site}/assets/logo-lockup.png` } },
    mainEntity: faq?.length ? {
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    } : undefined,
  };
  const sectionHtml = sections.map((section) => `
          <section class="source-evidence">
            <article>
              <h2>${escapeHTML(section.title)}</h2>
              ${section.body}
            </article>
          </section>`).join("");
  const faqHtml = faq?.length ? `
          <section class="source-evidence">
            <article>
              <h2>FAQ</h2>
              ${faq.map((item) => `<h3>${escapeHTML(item.q)}</h3><p>${escapeHTML(item.a)}</p>`).join("")}
            </article>
          </section>` : "";
  const body = `
      <section class="page-hero product-hero">
        <div class="product-hero-copy">
          <span class="section-label">${escapeHTML(heroLabel)}</span>
          <h1>${escapeHTML(h1)}</h1>
          <p>${escapeHTML(intro)}</p>
        </div>
        <aside class="product-hero-panel">
          <span>Updated</span>
          <strong>${escapeHTML(new Date(generatedAt).toISOString().slice(0, 10))}</strong>
          <p>Built from TechPulse product intelligence, GitHub, Hacker News, and video proof signals.</p>
        </aside>
      </section>
      <section class="product-workbench seo-article">
        <article class="product-detail">
          <section class="quick-take">
            <h2>Quick answer</h2>
            <p>${escapeHTML(intro)}</p>
          </section>
          ${sectionHtml}
          ${faqHtml}
        </article>
      </section>`;
  return layout({
    title,
    description,
    canonical,
    body,
    jsonLd,
    lang: "en",
    assetPrefix: "../",
    navPrefix: "../",
  });
}

function productComparisonTable(left, right) {
  return `<div class="source-list">
    <a href="../en/products/${slug(left.id || left.name)}.html"><strong>${escapeHTML(left.name)}</strong><span>Signal ${escapeHTML(left.signalScore || 0)} · ${escapeHTML(productEvidenceLine(left))}</span><p>${escapeHTML(englishProductSummary(left))}</p></a>
    <a href="../en/products/${slug(right.id || right.name)}.html"><strong>${escapeHTML(right.name)}</strong><span>Signal ${escapeHTML(right.signalScore || 0)} · ${escapeHTML(productEvidenceLine(right))}</span><p>${escapeHTML(englishProductSummary(right))}</p></a>
  </div>`;
}

function writeGuidePages(products, data) {
  const generatedAt = data.generatedAt || new Date().toISOString();
  const cursor = findProduct(products, "cursor") || products[0];
  const claudeCode = findProduct(products, "claude-code") || products[1] || products[0];
  const mcp = findProduct(products, "mcp") || findProduct(products, "Model Context Protocol") || products[0];
  const codingProducts = products.filter((product) => /coding|agent|infra/i.test(product.category || "")).slice(0, 10);
  const pages = [
    {
      slugName: "claude-code-vs-cursor",
      title: "Claude Code vs Cursor: GitHub, Hacker News and video signals - TechPulse",
      description: "A source-backed comparison of Claude Code and Cursor using GitHub repositories, Hacker News discussions, and video proof signals.",
      heroLabel: "AI Coding Comparison",
      h1: "Claude Code vs Cursor: which AI coding workflow is worth watching?",
      intro: "Claude Code is closer to a terminal-native agent workflow, while Cursor is closer to an AI-native IDE. TechPulse compares them through public GitHub, Hacker News, and video proof signals rather than brand claims.",
      sections: [
        { title: "Signal comparison", body: productComparisonTable(claudeCode, cursor) },
        { title: "When Claude Code is stronger", body: `<p>Claude Code is a better fit when the work starts in a repository or terminal and needs multi-file changes, refactors, git workflows, and command-line execution boundaries.</p>` },
        { title: "When Cursor is stronger", body: `<p>Cursor is a better fit when the user wants an IDE-centered flow with codebase context, autocomplete, agent assistance, and a more visual editing environment.</p>` },
        { title: "How to decide", body: `<p>Use Claude Code for terminal-first agent work and Cursor for IDE-first day-to-day coding. For teams, the final decision should include permission control, data policy, cost, and how easily each tool fits existing review workflows.</p>` },
      ],
      faq: [
        { q: "Is Claude Code better than Cursor?", a: "Not universally. Claude Code is stronger for terminal-native agent workflows, while Cursor is stronger for IDE-centered editing and codebase navigation." },
        { q: "How does TechPulse compare them?", a: "TechPulse combines public GitHub repositories, Hacker News discussions, video proof signals, and freshness indicators." },
      ],
    },
    {
      slugName: "best-ai-coding-tools",
      title: "Best AI coding tools to watch: GitHub and HN signal radar - TechPulse",
      description: "A daily-updated AI coding tools watchlist ranked by GitHub, Hacker News, and video proof signals.",
      heroLabel: "AI Coding Watchlist",
      h1: "Best AI coding tools to watch from GitHub and Hacker News signals",
      intro: "The best AI coding tools are not just the loudest products. TechPulse tracks source-backed signals so developers and product teams can decide which tools deserve attention.",
      sections: [
        {
          title: "Current watchlist",
          body: `<div class="source-list">${codingProducts.map((product) => `<a href="../en/products/${slug(product.id || product.name)}.html"><strong>${escapeHTML(product.name)}</strong><span>Signal ${escapeHTML(product.signalScore || 0)} · ${escapeHTML(product.category || "AI Product")}</span><p>${escapeHTML(englishProductSummary(product))}</p></a>`).join("")}</div>`,
        },
        { title: "What signals matter", body: `<p>GitHub stars can show developer interest, but they are not enough. TechPulse also looks at repository count, forks, Hacker News discussion, video proof, and freshness so a short-term spike does not dominate the radar.</p>` },
        { title: "How to use this list", body: `<p>Use this page as a research shortlist. Open the individual product profile before adoption, then check the official docs, pricing, privacy model, and integration limits.</p>` },
      ],
      faq: [
        { q: "Which AI coding tool should I try first?", a: "Start with the tool that matches your workflow: Cursor for IDE-centered coding, Claude Code for terminal-native agent tasks, and MCP-related tools for integration infrastructure." },
        { q: "Is this ranking sponsored?", a: "No. The page is generated from TechPulse public-source signals and links back to source evidence." },
      ],
    },
    {
      slugName: "model-context-protocol-guide",
      title: "What is Model Context Protocol? MCP GitHub and HN signal guide - TechPulse",
      description: "A practical explanation of Model Context Protocol with GitHub, Hacker News, and video proof signals tracked by TechPulse.",
      heroLabel: "AI Infrastructure Guide",
      h1: "What is Model Context Protocol, and why are AI teams watching it?",
      intro: "Model Context Protocol is an emerging connection layer for AI agents, tools, and data sources. The important question is not just what MCP is, but whether its ecosystem is becoming durable.",
      sections: [
        { title: "Current MCP signal", body: `<div class="source-list"><a href="../en/products/${slug(mcp.id || mcp.name)}.html"><strong>${escapeHTML(mcp.name)}</strong><span>Signal ${escapeHTML(mcp.signalScore || 0)} · ${escapeHTML(productEvidenceLine(mcp))}</span><p>${escapeHTML(englishProductSummary(mcp))}</p></a></div>` },
        { title: "Why MCP matters", body: `<p>AI agents need controlled ways to reach tools, files, APIs, and enterprise systems. MCP is interesting because it tries to standardize that connection layer instead of leaving every application to invent its own plugin model.</p>` },
        { title: "What to watch next", body: `<p>The strongest MCP signals will come from production-grade servers, security reviews, permission models, enterprise integrations, and real workflows beyond demos.</p>` },
      ],
      faq: [
        { q: "Is MCP only for developers?", a: "Today MCP is mostly developer-facing, but the long-term value is in making AI tools connect to business systems in a safer and more repeatable way." },
        { q: "How does TechPulse track MCP?", a: "TechPulse watches MCP-related GitHub repositories, Hacker News discussions, and public video summaries, then aligns them into a product intelligence profile." },
      ],
    },
  ];
  for (const page of pages) {
    fs.writeFileSync(path.join(guidesDir, `${page.slugName}.html`), guidePage({ ...page, generatedAt }));
  }
  return pages.map((page) => `/guides/${page.slugName}.html`);
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

function writeLlms(products, videos, data, guideUrls = []) {
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
    `- English product radar: ${site}/en/products.html`,
    `- Search: ${site}/search.html`,
    `- Methodology: ${site}/pipeline.html`,
    `- RSS feed: ${site}/feed.xml`,
    `- Machine-readable product index: ${site}/ai-products.json`,
    "",
    "## Search guides",
    ...guideUrls.map((url) => `- ${site}${url}`),
    "",
    "## Product intelligence pages",
    ...products.slice(0, 20).map((product) => `- ${product.name}: ${site}/products/${slug(product.id || product.name)}.html`),
    "",
    "## English product intelligence pages",
    `- AI Product Radar: ${site}/en/products.html`,
    ...products.slice(0, 20).map((product) => `- What is ${product.name}?: ${site}/en/products/${slug(product.id || product.name)}.html`),
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
fs.mkdirSync(enProductsDir, { recursive: true });
fs.mkdirSync(guidesDir, { recursive: true });

const productData = readWindowJson(productDataPath, "TechPulseProducts");
const siteData = readWindowJson(siteDataPath, "TechPulseData");
const products = productData.products || [];
const videos = siteData.videos || [];

for (const product of products) {
  fs.writeFileSync(path.join(productsDir, `${slug(product.id || product.name)}.html`), productPage(product, { ...siteData, generatedAt: productData.generatedAt || siteData.generatedAt }));
  fs.writeFileSync(path.join(enProductsDir, `${slug(product.id || product.name)}.html`), productPageEn(product, { ...siteData, generatedAt: productData.generatedAt || siteData.generatedAt }));
}

fs.writeFileSync(path.join(enDir, "products.html"), writeEnglishProductIndex(products, { generatedAt: productData.generatedAt || siteData.generatedAt }));
const guideUrls = writeGuidePages(products, { generatedAt: productData.generatedAt || siteData.generatedAt });

for (const video of videos.slice(0, 40)) {
  fs.writeFileSync(path.join(topicsDir, `${slug(video.videoId || video.topic)}.html`), topicPage(video, siteData));
}

writeSitemap(products, videos, guideUrls);
writeFeed(products, videos, { generatedAt: productData.generatedAt || siteData.generatedAt });
writeProductsJson(products, { generatedAt: productData.generatedAt || siteData.generatedAt });
writeLlms(products, videos, { generatedAt: productData.generatedAt || siteData.generatedAt }, guideUrls);
console.log(`Generated ${products.length} zh product pages, ${products.length} en product pages, ${guideUrls.length} guide pages, ${Math.min(videos.length, 40)} topic pages, sitemap.xml, feed.xml, ai-products.json, llms.txt`);
