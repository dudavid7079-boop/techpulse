function seoSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function productSeoUrl(productId) {
  return `./products/${seoSlug(productId)}.html`;
}

function topicSeoUrl(videoId) {
  return `./topics/${seoSlug(videoId)}.html`;
}

const { videos } = window.TechPulseData;
const { scoreVideo, formatNumber } = window.TechPulseUtils;

const queryInput = document.querySelector("#archiveQuery");
const categorySelect = document.querySelector("#archiveCategory");
const sortSelect = document.querySelector("#archiveSort");
const results = document.querySelector("#archiveResults");

let productState = { products: [] };

const initialQuery = new URLSearchParams(location.search).get("q");
if (initialQuery && !queryInput.value) {
  queryInput.value = initialQuery;
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

function searchableProductText(product) {
  return [
    product.name,
    product.category,
    product.summary,
    product.quickTake,
    product.risk,
    ...(product.keywords || []),
    ...(product.badges || []),
    ...((product.sourceEvidence?.github?.repos || []).flatMap((repo) => [repo.name, repo.repo, repo.description])),
    ...((product.sourceEvidence?.hackerNews?.stories || []).map((story) => story.title)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function productMatchesCategory(product, category) {
  if (category === "all") return true;
  return String(product.category || "").toLowerCase().includes(category.toLowerCase());
}

function videoMatchesCategory(video, category) {
  return category === "all" || video.category === category;
}

function productToResult(product) {
  const videoCount = product.videoProofs?.length || Math.round((product.sourceMix?.video || 0) / 12);
  return {
    type: "product",
    id: product.id,
    title: product.name,
    category: product.category,
    summary: product.summary || product.quickTake || "产品档案正在补充中。",
    score: product.signalScore || 0,
    quality: product.signalScore || 0,
    recentValue: -(product.trendDelta || 0),
    href: productSeoUrl(product.id),
    meta: `产品档案 · ${product.category || "AI"}`,
    asideLabel: "Signal",
    asideSmall: `${product.trendDelta >= 0 ? "+" : ""}${product.trendDelta || 0} today · ${videoCount} video proofs`,
    tags: [
      product.sourceMix?.github ? "GitHub 生态" : "生态待补充",
      product.sourceMix?.community ? "HN / 社区讨论" : "社区待补充",
      videoCount ? `${videoCount} 条视频证明` : "等待视频证明",
    ],
    analytics: `data-analytics-event="search_result_click" data-analytics-action="search_product" data-product-id="${escapeHTML(product.id)}" data-category="${escapeHTML(product.category)}"`,
  };
}

function videoToResult(video) {
  const score = scoreVideo(video);
  return {
    type: "video",
    id: video.videoId,
    title: video.topic,
    category: video.category,
    summary: video.summary,
    score,
    quality: video.quality,
    recentValue: video.publishedHours,
    href: topicSeoUrl(video.videoId),
    meta: `${video.category} · ${video.channel}`,
    asideLabel: "Score",
    asideSmall: `${formatNumber(video.views)} views`,
    tags: video.tags || [],
    analytics: `data-analytics-event="search_result_click" data-analytics-action="search_archive" data-video-id="${escapeHTML(video.videoId)}" data-channel="${escapeHTML(video.channel)}" data-category="${escapeHTML(video.category)}"`,
  };
}

function renderResult(item) {
  return `
    <a class="archive-card" href="${item.href}" ${item.analytics}>
      <div>
        <span>${escapeHTML(item.meta)}</span>
        <h2>${escapeHTML(item.title)}</h2>
        <p>${escapeHTML(item.summary)}</p>
        <div class="topic-tags">${item.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}</div>
      </div>
      <aside>
        <b>${formatNumber(item.score)}</b>
        <span>${escapeHTML(item.asideLabel)}</span>
        <small>${escapeHTML(item.asideSmall)}</small>
      </aside>
    </a>
  `;
}

function renderSearch() {
  const query = queryInput.value.trim().toLowerCase();
  const category = categorySelect.value;

  const productResults = productState.products
    .filter((product) => productMatchesCategory(product, category))
    .filter((product) => !query || searchableProductText(product).includes(query))
    .map(productToResult);

  const videoResults = videos
    .filter((video) => videoMatchesCategory(video, category))
    .filter((video) => {
      const haystack = `${video.topic} ${video.channel} ${video.summary} ${(video.tags || []).join(" ")}`.toLowerCase();
      return !query || haystack.includes(query);
    })
    .map(videoToResult);

  const filtered = [...productResults, ...videoResults].sort((a, b) => {
    if (sortSelect.value === "recent") return a.recentValue - b.recentValue;
    if (sortSelect.value === "quality") return b.quality - a.quality;
    return b.score - a.score;
  });

  const locked = !window.TechPulseAuth.isRegistered() && filtered.length > 5;
  const visible = window.TechPulseAuth.isRegistered() ? filtered : filtered.slice(0, 5);

  results.innerHTML = visible.length
    ? visible.map(renderResult).join("") +
      (locked
        ? window.TechPulseAuth.gateMarkup(
            "注册后搜索完整产品与历史归档",
            `未注册用户展示前 5 条结果。注册后可查看当前 ${filtered.length} 条匹配内容，并保存搜索条件。`,
            "search-archive"
          )
        : "")
    : `<article class="empty-state"><h3>没有找到结果</h3><p>试试 Cursor、Claude Code、MCP、OpenAI、Phone 或 Workspace。</p></article>`;
}

[queryInput, categorySelect, sortSelect].forEach((control) => control.addEventListener("input", renderSearch));
queryInput.addEventListener("change", () => {
  window.TechPulseAnalytics?.track("search_query_submit", {
    queryLength: queryInput.value.trim().length,
    category: categorySelect.value,
    sort: sortSelect.value,
  });
});

async function initSearch() {
  const loaded = await (window.TechPulseProductsReady || Promise.resolve(window.TechPulseProducts || { products: [] }));
  productState = loaded || { products: [] };
  productState.products = Array.isArray(productState.products) ? productState.products : [];
  renderSearch();
}

initSearch();
