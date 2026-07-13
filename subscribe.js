const { videos } = window.TechPulseData;
const { scoreVideo, formatNumber } = window.TechPulseUtils;

const form = document.querySelector("#subscriptionForm");
const preview = document.querySelector("#digestPreview");
const notice = document.querySelector("#subscriptionNotice");
const deliveryChannel = document.querySelector("#deliveryChannel");
const keywordInput = document.querySelector("#keywordInput");
const digestTime = document.querySelector("#digestTime");
const watchlistPreview = document.querySelector("#watchlistPreview");
const productState = window.TechPulseProducts || { products: [] };
const WATCHLIST_KEY = "techpulse-product-watchlist";

function watchlist() {
  return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
}

function requestedProduct() {
  const id = new URLSearchParams(location.search).get("product");
  return productState.products.find((product) => product.id === id);
}

function mergeKeywords(...groups) {
  return [...new Set(groups.flat().map((item) => item.trim()).filter(Boolean))];
}

function productKeywords() {
  return mergeKeywords(subscriptionProducts().flatMap((product) => [product.name, ...(product.keywords || [])]));
}

function subscriptionProducts() {
  const watched = watchlist();
  const requested = requestedProduct();
  return requested && !watched.some((item) => item.id === requested.id) ? [...watched, requested] : watched;
}

function renderPreview() {
  const topVideos = [...videos]
    .map((video) => ({ ...video, score: scoreVideo(video) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  preview.innerHTML = topVideos
    .map(
      (video, index) => `
        <article>
          <b>${String(index + 1).padStart(2, "0")}</b>
          <div>
            <strong>${video.topic}</strong>
            <p>${video.channel} · Score ${formatNumber(video.score)}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function loadPreferences() {
  const saved = JSON.parse(localStorage.getItem("techpulse-subscription") || "null");
  const mergedKeywords = mergeKeywords((saved?.keywords || "OpenAI, MKBHD, AI Agents").split(","), productKeywords());
  keywordInput.value = mergedKeywords.join(", ");
  if (!saved) return;
  deliveryChannel.value = saved.deliveryChannel;
  digestTime.value = saved.digestTime;
}

function renderWatchlistPreview() {
  if (!watchlistPreview) return;
  const products = subscriptionProducts();
  watchlistPreview.innerHTML = products.length
    ? `
      <div>
        <span>已纳入监控</span>
        <strong>${products.map((product) => product.name).join(" / ")}</strong>
      </div>
      <small>这些产品的名称和关键词已自动写入订阅条件。</small>
    `
    : `
      <div>
        <span>产品监控</span>
        <strong>还没有关注产品</strong>
      </div>
      <small>可先到产品雷达页关注 Cursor、MCP、Claude Code 等实体。</small>
    `;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  window.TechPulseAnalytics?.track("subscription_save_click", {
    deliveryChannel: deliveryChannel.value,
    keywordCount: keywordInput.value.split(",").map((item) => item.trim()).filter(Boolean).length,
    digestTime: digestTime.value,
    registered: window.TechPulseAuth.isRegistered(),
  });
  if (!window.TechPulseAuth.isRegistered()) {
    notice.innerHTML = `保存订阅需要注册。<a href="${window.TechPulseAuth.authUrl("subscription")}">免费注册后继续</a>`;
    return;
  }
  localStorage.setItem(
    "techpulse-subscription",
    JSON.stringify({
      deliveryChannel: deliveryChannel.value,
      keywords: keywordInput.value,
      digestTime: digestTime.value,
      products: subscriptionProducts().map((item) => item.id),
    })
  );
  notice.textContent = "订阅偏好已保存，可在“我的账户”查看。";
});

loadPreferences();
renderWatchlistPreview();
renderPreview();
