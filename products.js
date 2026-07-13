let productState = { products: [] };
const productVideos = window.TechPulseData?.videos || [];
const productDirectory = document.querySelector("#productDirectory");
const productDetail = document.querySelector("#productDetail");
const productSearch = document.querySelector("#productSearch");
const productCategory = document.querySelector("#productCategory");
const watchOnly = document.querySelector("#watchOnly");
const productSignalStrip = document.querySelector("#productSignalStrip");
const WATCHLIST_KEY = "techpulse-product-watchlist";

const productFilters = {
  query: "",
  category: "all",
  watchOnly: false,
};

function readWatchlist() {
  return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
}

function saveWatchlist(items) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
}

function productById(id) {
  return productState.products.find((product) => product.id === id) || productState.products[0] || null;
}

function productHaystack(product) {
  return [product.name, product.category, product.tagline, product.quickTake, ...(product.keywords || []), ...(product.evidence || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filteredProducts() {
  const query = productFilters.query.trim().toLowerCase();
  return productState.products.filter((product) => {
    const categoryMatch = productFilters.category === "all" || product.category === productFilters.category;
    const queryMatch = !query || productHaystack(product).includes(query);
    const watchMatch = !productFilters.watchOnly || isWatching(product.id);
    return categoryMatch && queryMatch && watchMatch;
  });
}

function coverageGaps() {
  return productState.products.filter((product) => (product.sourceMix?.video || 0) < 15 || (product.sourceMix?.community || 0) < 20);
}

function strongestProduct() {
  return productState.products.slice().sort((a, b) => b.signalScore - a.signalScore)[0];
}

function renderSignalStrip() {
  if (!productSignalStrip) return;
  const watchedCount = readWatchlist().length;
  const strongest = strongestProduct();
  const gaps = coverageGaps();
  productSignalStrip.innerHTML = `
    <article>
      <span>产品实体</span>
      <b>${String(productState.products.length).padStart(2, "0")}</b>
      <p>当前产品雷达覆盖数</p>
    </article>
    <article>
      <span>已关注</span>
      <b>${String(watchedCount).padStart(2, "0")}</b>
      <p>${watchedCount ? "订阅中心会自动带入关键词" : "可从产品卡片开始关注"}</p>
    </article>
    <article>
      <span>最高信号</span>
      <b>${strongest?.signalScore || 0}</b>
      <p>${strongest?.name || "等待数据生成"}</p>
    </article>
    <article>
      <span>证据缺口</span>
      <b>${String(gaps.length).padStart(2, "0")}</b>
      <p>${gaps.length ? gaps.slice(0, 2).map((product) => product.name).join(" / ") : "核心产品证据完整"}</p>
    </article>
  `;
}

function isWatching(productId) {
  return readWatchlist().some((item) => item.id === productId);
}

function toggleWatchProduct(product) {
  const items = readWatchlist();
  const existing = items.find((item) => item.id === product.id);
  const next = existing
    ? items.filter((item) => item.id !== product.id)
    : [
        ...items,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          keywords: product.keywords,
          addedAt: new Date().toISOString(),
        },
      ];
  saveWatchlist(next);
  renderSignalStrip();
  window.TechPulseAnalytics?.track(existing ? "product_unwatch_click" : "product_watch_click", {
    productId: product.id,
    category: product.category,
  });
}

function relatedVideos(product) {
  const ids = new Set(product.videos || []);
  const keywords = (product.keywords || []).map((keyword) => keyword.toLowerCase());
  return productVideos
    .filter((video) => {
      const haystack = `${video.topic || ""} ${video.summary || ""} ${(video.tags || []).join(" ")} ${video.channel || ""}`.toLowerCase();
      return ids.has(video.videoId) || keywords.some((keyword) => haystack.includes(keyword));
    })
    .slice(0, 3);
}

function renderDirectory(activeId) {
  if (!productDirectory) return;
  const products = filteredProducts();
  const content = products.length
    ? products
        .map(
          (product, index) => `
            <button class="${product.id === activeId ? "active" : ""}" data-product-id="${product.id}">
              <b>${String(index + 1).padStart(2, "0")}</b>
              <span>
                <strong>${product.name}</strong>
                <small>${product.category} · Score ${product.signalScore}</small>
              </span>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state compact-empty"><h3>没有匹配产品</h3><p>换个关键词，或关闭“只看已关注”。</p></div>`;
  productDirectory.innerHTML = content;
}

function renderCategoryOptions() {
  if (!productCategory) return;
  const categories = [...new Set(productState.products.map((product) => product.category))].sort();
  productCategory.innerHTML = [`<option value="all">全部分类</option>`, ...categories.map((category) => `<option value="${category}">${category}</option>`)].join("");
}

function metricBlock(label, value, detail) {
  return `
    <article>
      <span>${label}</span>
      <b>${value}</b>
      <p>${detail}</p>
    </article>
  `;
}

function sourceSignalCard(label, signal, body) {
  return `
    <article>
      <span>${label}</span>
      <b>${signal}</b>
      <p>${body}</p>
    </article>
  `;
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
}

function renderGithubRepos(github) {
  const repos = github.repos || [];
  return repos.length
    ? repos
        .slice(0, 3)
        .map(
          (repo) => `
            <a href="${repo.url}" target="_blank" rel="noreferrer" data-analytics-event="product_github_repo_click" data-analytics-action="product_detail" data-destination="${repo.url}">
              <strong>${repo.name || repo.repo}</strong>
              <span>${formatCompactNumber(repo.stars)} stars · ${formatCompactNumber(repo.forks)} forks · ${repo.pushedAt ? new Date(repo.pushedAt).toLocaleDateString("zh-CN") : "最近活跃待确认"}</span>
              <p>${repo.description || "暂无仓库描述。"}</p>
            </a>
          `
        )
        .join("")
    : `<div class="empty-state compact-empty"><h3>暂无 GitHub 仓库信号</h3><p>下一轮采集会继续用产品名和关键词匹配相关仓库。</p></div>`;
}

function renderHackerNewsStories(hackerNews) {
  const stories = hackerNews.topStories || [];
  return stories.length
    ? stories
        .slice(0, 3)
        .map(
          (story) => `
            <a href="${story.hnUrl || story.url}" target="_blank" rel="noreferrer" data-analytics-event="product_hn_story_click" data-analytics-action="product_detail" data-destination="${story.hnUrl || story.url}">
              <strong>${story.title}</strong>
              <span>${story.points || 0} points · ${story.comments || 0} comments · ${story.createdAt ? new Date(story.createdAt).toLocaleDateString("zh-CN") : "时间待确认"}</span>
            </a>
          `
        )
        .join("")
    : `<div class="empty-state compact-empty"><h3>暂无 Hacker News 讨论</h3><p>下一轮采集会继续检索 HN 新讨论。</p></div>`;
}

function renderSourceEvidence(product) {
  const signals = product.sourceSignals || {};
  const github = signals.github || {};
  const hackerNews = signals.hackerNews || {};

  return `
    <section class="source-evidence">
      <article>
        <div class="compact-heading">
          <span class="section-label">GitHub Signal</span>
          <h3>源码生态与项目活跃度</h3>
          <p>${github.detail || "用仓库 stars、forks、issues 和最近 push 时间判断技术生态信号。"}</p>
        </div>
        <div class="source-list">${renderGithubRepos(github)}</div>
      </article>
      <article>
        <div class="compact-heading">
          <span class="section-label">Hacker News Signal</span>
          <h3>工程师社区讨论</h3>
          <p>${hackerNews.detail || "用 HN points、comments 和讨论标题判断社区关注点。"}</p>
        </div>
        <div class="source-list">${renderHackerNewsStories(hackerNews)}</div>
      </article>
    </section>
  `;
}

function renderSourceSignals(product) {
  const signals = product.sourceSignals || {};
  const github = signals.github || {};
  const hackerNews = signals.hackerNews || {};
  const githubLabel = github.topRepo?.name || `${github.repoCount || 0} repos`;
  const hnLabel = `${hackerNews.comments || 0} comments`;

  return `
    <section class="source-signal-grid">
      ${sourceSignalCard("GitHub", githubLabel, github.detail || "等待 GitHub 仓库或搜索信号。")}
      ${sourceSignalCard("Hacker News", hnLabel, hackerNews.detail || "等待 HN 讨论信号。")}
      ${sourceSignalCard("Video Proof", `${product.videos?.length || 0} videos`, "用海外视频摘要补充产品演示、争议和实机证据。")}
    </section>
  `;
}

function renderDetail(productId) {
  if (!productDetail) return;
  const products = filteredProducts();
  const requested = productById(productId);
  if (!products.length) {
    renderDirectory(requested?.id);
    productDetail.innerHTML = `
      <section class="empty-state product-empty-state">
        <h3>没有匹配的产品档案</h3>
        <p>可以清空搜索、切换分类，或先取消“只看已关注”。TechPulse 会在后续刷新中继续扩展产品实体库。</p>
      </section>
    `;
    return;
  }

  const product = products.find((item) => item.id === requested?.id) || products[0];
  if (!product) return;
  const videos = relatedVideos(product);
  renderDirectory(product.id);
  const githubSummary = product.github || { detail: product.sourceSignals?.github?.detail || "等待 GitHub 仓库或搜索信号。" };
  const communitySummary = product.community || { detail: product.sourceSignals?.hackerNews?.detail || "等待 HN 讨论信号。" };

  productDetail.innerHTML = `
    <div class="product-detail-head">
      <div>
        <span class="section-label">${product.category}</span>
        <h2>${product.name}</h2>
        <p>${product.tagline}</p>
        <div class="product-actions">
          <button class="button primary" type="button" data-product-watch="${product.id}">
            ${isWatching(product.id) ? "已关注该产品" : "关注产品信号"}
          </button>
          <a class="button secondary" href="./subscribe.html?product=${product.id}" data-analytics-event="product_subscribe_click" data-analytics-action="product_detail" data-product-id="${product.id}" data-category="${product.category}">订阅关键词</a>
        </div>
      </div>
      <div class="signal-score">
        <span>Signal</span>
        <b>${product.signalScore}</b>
        <small>${product.signalTrend} today</small>
      </div>
    </div>

    <section class="quick-take">
      <h3>3 秒看懂</h3>
      <p>${product.quickTake}</p>
      <div class="product-tags">
        ${product.evidence.map((item) => `<span>${item}</span>`).join("")}
      </div>
    </section>

    <section class="signal-mix">
      ${metricBlock("GitHub", `${product.sourceMix?.github || 0}%`, githubSummary.detail)}
      ${metricBlock("社区讨论", `${product.sourceMix?.community || 0}%`, communitySummary.detail)}
      ${metricBlock("视频证明", `${product.sourceMix?.video || 0}%`, videos.length ? "已有可读中文视频摘要，可作为产品实机证明。" : "等待下一轮视频同步。")}
      ${metricBlock("新鲜度", `${product.sourceMix?.freshness || 0}%`, "按最近 24-72 小时新增信号加权。")}
    </section>

    ${renderSourceSignals(product)}

    ${renderSourceEvidence(product)}

    <section class="fit-grid">
      <article>
        <h3>适合谁</h3>
        <ul>${product.bestFor.map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
      <article>
        <h3>不适合谁</h3>
        <ul>${product.notFor.map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
      <article>
        <h3>主要风险</h3>
        <ul>${product.risks.map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
    </section>

    <section class="video-intelligence">
      <div class="section-heading compact-heading">
        <span class="section-label">Video Proof</span>
        <h3>海外视频情报摘要</h3>
        <p>大陆可读模式优先展示中文摘要和关键点；原视频仅作为来源链接。</p>
      </div>
      <div class="video-proof-list">
        ${
          videos.length
            ? videos
                .map(
                  (video) => `
                    <article>
                      <span>${video.channel} · ${video.category}</span>
                      <h4>${video.topic}</h4>
                      <p>${video.summary}</p>
                      <a class="detail-link" href="./topics.html?id=${video.videoId}" data-analytics-event="product_video_summary_click" data-analytics-action="product_detail" data-video-id="${video.videoId}" data-category="${product.category}">查看视频摘要</a>
                    </article>
                  `
                )
                .join("")
            : `<article class="empty-state"><h3>暂无匹配视频</h3><p>下一轮刷新会继续用关键词和实体对齐补充视频证明。</p></article>`
        }
      </div>
    </section>
  `;
}

productDirectory?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !button.dataset.productId) return;
  const productId = button.dataset.productId;
  history.replaceState(null, "", `./products.html?id=${productId}`);
  window.TechPulseAnalytics?.track("product_select", { productId });
  renderDetail(productId);
});

productSearch?.addEventListener("input", (event) => {
  productFilters.query = event.target.value;
  window.TechPulseAnalytics?.track("product_filter_change", { action: "search", queryLength: productFilters.query.length });
  renderDetail(productById(new URLSearchParams(location.search).get("id"))?.id);
});

productCategory?.addEventListener("change", (event) => {
  productFilters.category = event.target.value;
  window.TechPulseAnalytics?.track("product_filter_change", { action: "category", category: productFilters.category });
  renderDetail(productById(new URLSearchParams(location.search).get("id"))?.id);
});

watchOnly?.addEventListener("change", (event) => {
  productFilters.watchOnly = event.target.checked;
  window.TechPulseAnalytics?.track("product_filter_change", { action: "watch_only", enabled: productFilters.watchOnly });
  renderDetail(productById(new URLSearchParams(location.search).get("id"))?.id);
});

productDetail?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product-watch]");
  if (!button) return;
  const product = productById(button.dataset.productWatch);
  if (!product) return;
  toggleWatchProduct(product);
  renderDetail(product.id);
});

async function initProductsPage() {
  const loaded = await (window.TechPulseProductsReady || Promise.resolve(window.TechPulseProducts || { products: [] }));
  productState = loaded || { products: [] };
  productState.products = Array.isArray(productState.products) ? productState.products : [];
  const initialProductId = new URLSearchParams(location.search).get("id");
  renderCategoryOptions();
  renderSignalStrip();
  renderDetail(initialProductId);
}

initProductsPage();
