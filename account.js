const user = window.TechPulseAuth.getCurrentUser();
const subscription = JSON.parse(localStorage.getItem("techpulse-subscription") || "null");
const waitlist = JSON.parse(localStorage.getItem("techpulse-waitlist") || "[]");
const productWatchlist = JSON.parse(localStorage.getItem("techpulse-product-watchlist") || "[]");
const productState = window.TechPulseProducts || { products: [] };
const hero = document.querySelector("#accountHero");
const subscriptionBox = document.querySelector("#accountSubscription");

function subscribedProductNames() {
  const ids = new Set(subscription?.products || []);
  return productState.products.filter((product) => ids.has(product.id)).map((product) => product.name);
}

if (!user) {
  hero.innerHTML = `
    <span class="section-label">Account Required</span>
    <h1>登录后查看你的科技快报账户</h1>
    <p>注册后可以保存订阅偏好、查看完整摘要和历史搜索结果。</p>
    <a class="button primary" href="${window.TechPulseAuth.authUrl("account")}" data-analytics-event="account_register_click" data-analytics-action="account_required">免费注册 / 登录</a>
  `;
  document.querySelector(".account-layout").innerHTML = "";
} else {
  hero.innerHTML = `
    <span class="section-label">My Account</span>
    <h1>${user.email}</h1>
    <p>你当前关注：${user.interest}。注册时间：${new Date(user.createdAt).toLocaleDateString("zh-CN")}。</p>
  `;

  subscriptionBox.innerHTML = subscription
    ? `
      <div class="subscription-summary">
        <div><span>推送渠道</span><b>${subscription.deliveryChannel}</b></div>
        <div><span>关键词</span><b>${subscription.keywords}</b></div>
        <div><span>订阅产品</span><b>${subscribedProductNames().join(" / ") || "按关键词监控"}</b></div>
        <div><span>推送时间</span><b>${subscription.digestTime}</b></div>
      </div>
      <a class="button secondary" href="./subscribe.html" data-analytics-event="account_subscription_click" data-analytics-action="edit">修改订阅</a>
    `
    : `
      <div class="empty-state">
        <h3>还没有保存订阅偏好</h3>
        <p>订阅频道和关键词后，系统会把每日中文快报推送给你。</p>
      </div>
      <a class="button primary" href="./subscribe.html" data-analytics-event="account_subscription_click" data-analytics-action="setup">设置订阅</a>
    `;

  document.querySelector(".account-main").insertAdjacentHTML(
    "beforeend",
    `
      <section class="account-panel">
        <span class="section-label">Product Watchlist</span>
        <h2>关注中的 AI 产品</h2>
        ${
          productWatchlist.length
            ? `<div class="subscription-summary">${productWatchlist
                .map((item) => `<div><span>${item.name}</span><b>${(item.keywords || []).slice(0, 3).join(" / ")}</b></div>`)
                .join("")}</div><a class="button secondary" href="./products.html" data-analytics-event="account_products_click" data-analytics-action="watchlist_status">管理关注</a>`
            : `<div class="empty-state"><h3>还没有关注产品</h3><p>关注产品后，订阅中心会自动带入相关关键词。</p></div><a class="button primary" href="./products.html" data-analytics-event="account_products_click" data-analytics-action="empty_watchlist">去产品雷达</a>`
        }
      </section>
      <section class="account-panel">
        <span class="section-label">Membership</span>
        <h2>会员等待名单</h2>
        ${
          waitlist.length
            ? `<div class="subscription-summary">${waitlist
                .map((item) => `<div><span>${item.plan.toUpperCase()}</span><b>${new Date(item.joinedAt).toLocaleDateString("zh-CN")}</b></div>`)
                .join("")}</div><a class="button secondary" href="./pricing.html" data-analytics-event="account_pricing_click" data-analytics-action="waitlist_status">查看方案</a>`
            : `<div class="empty-state"><h3>还没有加入等待名单</h3><p>Pro 和 Team 功能会先以等待名单方式验证需求。</p></div><a class="button primary" href="./pricing.html" data-analytics-event="account_pricing_click" data-analytics-action="empty_waitlist">查看会员方案</a>`
        }
      </section>
    `
  );
}
