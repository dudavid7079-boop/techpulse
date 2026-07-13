const { videos, channels } = window.TechPulseData;
const { scoreVideo, formatNumber } = window.TechPulseUtils;
let productState = { products: [] };

const topicList = document.querySelector("#topicList");
const categoryFilter = document.querySelector("#categoryFilter");
const sortMode = document.querySelector("#sortMode");
const searchInput = document.querySelector("#searchInput");
const channelGrid = document.querySelector("#channelGrid");
const videoFrame = document.querySelector("#videoFrame");
const playerTitle = document.querySelector("#playerTitle");
const playerRoute = document.querySelector("#playerRoute");
const playerSummary = document.querySelector("#playerSummary");
const chapterList = document.querySelector("#chapterList");
const invidiousLink = document.querySelector("#invidiousLink");
const youtubeLink = document.querySelector("#youtubeLink");
const heroTopic = document.querySelector("#heroTopic");
const heroSummary = document.querySelector("#heroSummary");
const pipelineStatus = document.querySelector("#pipelineStatus");
const productRadar = document.querySelector("#productRadar");
const playbackConfig = window.TechPulsePlayback || {};
const PRODUCT_WATCHLIST_KEY = "techpulse-product-watchlist";
let invidiousStatus = null;

function readProductWatchlist() {
  return JSON.parse(localStorage.getItem(PRODUCT_WATCHLIST_KEY) || "[]");
}

function saveProductWatchlist(items) {
  localStorage.setItem(PRODUCT_WATCHLIST_KEY, JSON.stringify(items));
}

function isProductWatched(productId) {
  return readProductWatchlist().some((item) => item.id === productId);
}

function toggleProductWatch(product) {
  const items = readProductWatchlist();
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
  saveProductWatchlist(next);
  window.TechPulseAnalytics?.track(existing ? "product_unwatch_click" : "product_watch_click", {
    action: "home_radar",
    productId: product.id,
    category: product.category,
  });
}

async function readJson(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function formatDateTime(iso) {
  if (!iso) return "未知";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

function renderPipelineStatus(jobStatus, channelTests, refreshStatus) {
  if (!pipelineStatus) return;
  const sourceLabel = window.TechPulseDataSource === "generated" ? "Pipeline 生成数据" : "Demo 演示数据";
  const modeLabel = jobStatus?.mode === "youtube-api" ? "YouTube API 精准指标" : jobStatus?.mode === "estimated" ? "估算预览指标" : "静态数据";
  const refreshedAt = jobStatus?.finishedAt || window.TechPulseData.generatedAt;
  const channelHealth = channelTests ? `${channelTests.okCount}/${channelTests.count} 来源可用` : "来源持续巡检";
  const failedCount = channelTests ? Math.max(0, channelTests.count - channelTests.okCount) : 0;
  const refreshFailed = refreshStatus?.status === "failed";
  const refreshNotice = refreshFailed
    ? `<p class="pipeline-warning">最近一次完整刷新在 ${refreshStatus.stage || "未知阶段"} 失败，当前继续使用上一版有效数据。</p>`
    : "";

  pipelineStatus.innerHTML = `
    <div>
      <span class="section-label">Data Status</span>
      <strong>${sourceLabel}</strong>
      <p>${modeLabel} · 最近刷新 ${formatDateTime(refreshedAt)}</p>
      ${refreshNotice}
    </div>
    <div class="home-status-metrics">
      <a href="./topics.html?source=${window.TechPulseDataSource}">
        <b>${jobStatus?.topicCount || videos.length}</b>
        <span>热榜话题</span>
      </a>
      <a href="./channels.html?source=${window.TechPulseDataSource}">
        <b>${channelHealth}</b>
        <span>${failedCount ? "部分来源等待更新" : "来源状态"}</span>
      </a>
    </div>
  `;
}

function renderProductRadar() {
  if (!productRadar) return;
  if (!productState.products.length) {
    productRadar.innerHTML = `
      <div class="product-radar-empty">
        <strong>产品信号正在同步</strong>
        <p>GitHub 与 Hacker News 数据暂未加载，请稍后刷新或打开完整产品雷达。</p>
        <a class="button primary" href="./products.html">打开完整产品雷达</a>
      </div>
    `;
    return;
  }
  productRadar.innerHTML = productState.products
    .slice()
    .sort((a, b) => b.signalScore - a.signalScore)
    .map(
      (product, index) => `
        <article class="product-radar-card">
          <div class="product-rank">
            <b>${String(index + 1).padStart(2, "0")}</b>
            <span>Signal ${product.signalScore}</span>
          </div>
          <div>
            <div class="topic-meta">
              <span>${product.category}</span>
              <span>${product.signalTrend} today</span>
              <span>${Array.isArray(product.videos) ? product.videos.length : 0} video proofs</span>
            </div>
            <h3>${product.name}</h3>
            <p>${product.tagline}</p>
            <div class="topic-tags">${(Array.isArray(product.evidence) ? product.evidence : []).map((item) => `<span>${item}</span>`).join("")}</div>
            <div class="product-card-actions">
              <button type="button" data-product-watch="${product.id}">${isProductWatched(product.id) ? "已关注" : "关注信号"}</button>
              <a href="./subscribe.html?product=${product.id}" data-analytics-event="product_subscribe_click" data-analytics-action="home_radar" data-product-id="${product.id}" data-category="${product.category}">订阅关键词</a>
              <a class="detail-link" href="./products.html?id=${product.id}" data-analytics-event="product_detail_click" data-analytics-action="home_radar" data-product-id="${product.id}" data-category="${product.category}">查看档案</a>
            </div>
          </div>
        </article>
      `
    )
    .join("");
  const statProducts = document.querySelector("#statProducts");
  if (statProducts) statProducts.textContent = String(productState.products.length).padStart(2, "0");
}

async function initProductRadar() {
  const loaded = await (window.TechPulseProductsReady || Promise.resolve(window.TechPulseProducts || { products: [] }));
  productState = loaded || { products: [] };
  productState.products = Array.isArray(productState.products) ? productState.products : [];
  renderProductRadar();
}

function isInvidiousHealthy() {
  return playbackConfig.invidiousEnabled && invidiousStatus?.status === "healthy";
}

function officialEmbedUrl(videoId) {
  const baseUrl = playbackConfig.officialEmbedBaseUrl || "https://www.youtube-nocookie.com/embed";
  return `${baseUrl}/${videoId}`;
}

function youtubeWatchUrl(videoId) {
  const baseUrl = playbackConfig.youtubeWatchBaseUrl || "https://www.youtube.com/watch";
  return `${baseUrl}?v=${videoId}`;
}

function invidiousWatchUrl(videoId) {
  const baseUrl = (invidiousStatus?.baseUrl || playbackConfig.invidiousBaseUrl || "").replace(/\/+$/, "");
  return `${baseUrl}/watch?v=${videoId}`;
}

function renderInvidiousAction(videoId) {
  if (!invidiousLink) return;
  invidiousLink.dataset.analyticsEvent = "video_backup_route_click";
  invidiousLink.dataset.analyticsAction = "home_player";
  invidiousLink.dataset.videoId = videoId;
  if (isInvidiousHealthy()) {
    invidiousLink.href = invidiousWatchUrl(videoId);
    invidiousLink.textContent = "备用线路播放";
    invidiousLink.classList.remove("disabled");
    invidiousLink.removeAttribute("aria-disabled");
    return;
  }

  invidiousLink.href = "#";
  invidiousLink.textContent = invidiousStatus?.status === "unhealthy" ? "备用线路维护中" : "备用线路待检测";
  invidiousLink.classList.add("disabled");
  invidiousLink.setAttribute("aria-disabled", "true");
}

function routeDescription(video) {
  const base = "默认使用 YouTube 官方 no-cookie 嵌入播放，摘要、时间点和热度信息可直接阅读。";
  if (isInvidiousHealthy()) {
    return `${base} 当前自建 Invidious 备用线路健康，可用于尝试备用播放。`;
  }
  if (invidiousStatus?.status === "unhealthy") {
    return `${base} 自建 Invidious 备用线路当前不可用，已自动隐藏直连入口。`;
  }
  return `${base} 自建 Invidious 备用线路上线前需先通过健康检查。`;
}

function getSortedVideos() {
  const category = categoryFilter.value;
  const query = searchInput.value.trim().toLowerCase();
  const enriched = videos.map((video) => ({ ...video, score: scoreVideo(video) }));

  return enriched
    .filter((video) => category === "all" || video.category === category)
    .filter((video) => {
      const haystack = `${video.topic} ${video.channel} ${video.tags.join(" ")}`.toLowerCase();
      return !query || haystack.includes(query);
    })
    .sort((a, b) => {
      if (sortMode.value === "recent") return a.publishedHours - b.publishedHours;
      if (sortMode.value === "comments") return b.comments - a.comments;
      return b.score - a.score;
    });
}

function renderTopics() {
  const sorted = getSortedVideos();

  topicList.innerHTML = sorted.length
    ? sorted
        .map(
          (video, index) => `
            <article class="topic-card ${index === 0 ? "active" : ""}" data-video-id="${video.videoId}">
              <div class="rank-tile">
                <div><b>${String(index + 1).padStart(2, "0")}</b><span>SCORE ${formatNumber(video.score)}</span></div>
              </div>
              <div>
                <div class="topic-meta">
                  <span>${video.category}</span>
                  <span>${video.channel}</span>
                  <span>${video.publishedHours.toFixed(1)}h ago</span>
                </div>
                <h3>${video.topic}</h3>
                <p>${video.summary}</p>
                <div class="video-stats">
                  <span>${formatNumber(video.views)} views</span>
                  <span>${formatNumber(video.likes)} likes</span>
                  <span>${formatNumber(video.comments)} comments</span>
                </div>
                <div class="topic-tags">${video.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
                <a class="detail-link" href="./topics.html?id=${video.videoId}" data-analytics-event="topic_detail_click" data-analytics-action="home_card" data-video-id="${video.videoId}" data-channel="${video.channel}" data-category="${video.category}">查看话题详情</a>
              </div>
            </article>
          `
        )
        .join("")
    : `<article class="empty-state"><h3>没有匹配的话题</h3><p>换一个关键词或分类试试。</p></article>`;

  const first = sorted[0];
  if (first) selectVideo(first.videoId);
  document.querySelector("#statTopics").textContent = String(sorted.length).padStart(2, "0");
}

function selectVideo(videoId) {
  const video = videos.find((item) => item.videoId === videoId);
  if (!video) return;

  document.querySelectorAll(".topic-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.videoId === videoId);
  });

  videoFrame.src = officialEmbedUrl(video.videoId);
  playerTitle.textContent = video.topic;
  playerRoute.textContent = routeDescription(video);
  playerSummary.textContent = video.summary;
  chapterList.innerHTML = video.chapters.map((chapter) => `<li>${chapter}</li>`).join("");
  renderInvidiousAction(video.videoId);
  youtubeLink.href = youtubeWatchUrl(video.videoId);
  youtubeLink.dataset.analyticsEvent = "video_original_click";
  youtubeLink.dataset.analyticsAction = "home_player";
  youtubeLink.dataset.videoId = video.videoId;
  youtubeLink.dataset.channel = video.channel;
  youtubeLink.dataset.category = video.category;
  heroTopic.textContent = video.topic;
  heroSummary.textContent = video.summary;
}

function renderChannels() {
  channelGrid.innerHTML = channels
    .slice(0, 8)
    .map(
      (channel) => `
        <article class="channel-card">
          <div>
            <strong>${channel.name}</strong>
            <p>${channel.type}</p>
            <p>${channel.description}</p>
          </div>
          <button type="button" data-channel="${channel.name}" data-analytics-event="creator_subscribe_click" data-analytics-action="home_channel_card">订阅创作者</button>
        </article>
      `
    )
    .join("");
}

async function initStatus() {
  const [jobStatus, channelTests, playbackStatus, refreshStatus] = await Promise.all([
    readJson("./pipeline/job-status.json"),
    readJson("./pipeline/channel-tests.json"),
    readJson(playbackConfig.statusPath || "./pipeline/invidious-status.json"),
    readJson("./pipeline/refresh-status.json")
  ]);
  invidiousStatus = playbackStatus;
  renderPipelineStatus(jobStatus, channelTests, refreshStatus);
  const activeCard = document.querySelector(".topic-card.active");
  if (activeCard) selectVideo(activeCard.dataset.videoId);
}

topicList.addEventListener("click", (event) => {
  if (event.target.closest("a")) return;
  const card = event.target.closest(".topic-card");
  if (card) selectVideo(card.dataset.videoId);
});

[categoryFilter, sortMode, searchInput].forEach((control) => {
  control.addEventListener("input", renderTopics);
});

channelGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  button.classList.toggle("subscribed");
  button.textContent = button.classList.contains("subscribed") ? "已订阅" : "订阅创作者";
});

productRadar?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product-watch]");
  if (!button) return;
  const product = productState.products.find((item) => item.id === button.dataset.productWatch);
  if (!product) return;
  toggleProductWatch(product);
  renderProductRadar();
});

renderChannels();
renderTopics();
initStatus();
initProductRadar();
