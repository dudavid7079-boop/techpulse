const AUTH_KEY = "techpulse-user";
const PENDING_PLAN_KEY = "techpulse-pending-plan";

function getCurrentUser() {
  return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
}

function isRegistered() {
  return Boolean(getCurrentUser());
}

function registerUser(profile) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      email: profile.email,
      interest: profile.interest,
      createdAt: new Date().toISOString(),
    })
  );
}

function logoutUser() {
  localStorage.removeItem(AUTH_KEY);
}

function currentPageWithQuery() {
  const page = location.pathname.split("/").pop() || "index.html";
  return `${page}${location.search || ""}${location.hash || ""}`;
}

function authUrl(reason = "unlock") {
  return `./auth.html?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent(currentPageWithQuery())}`;
}

function safeNextUrl(value) {
  if (!value) return "./index.html";
  if (/^https?:\/\//i.test(value) || value.startsWith("//")) return "./index.html";
  if (value.startsWith("/")) return `.${value}`;
  return value;
}

function pendingPlanFromReason(reason = "") {
  const match = reason.match(/^(pro|team)-waitlist$/);
  return match ? match[1] : "";
}

function reasonCopy(reason = "") {
  if (reason === "nav") return "注册后会返回你刚才访问的页面。";
  if (reason === "account") return "注册后即可查看账户、订阅偏好和会员等待名单。";
  if (reason === "pro-waitlist") return "注册后会自动加入 Pro 等待名单，并返回会员页。";
  if (reason === "team-waitlist") return "注册后会自动加入 Team 等待名单，并返回会员页。";
  if (reason.includes("subscribe")) return "注册后即可保存频道、关键词和推送偏好。";
  return "免费注册后，可保存订阅偏好、会员等待名单和阅读进度。";
}

function renderAuthNav() {
  const nav = document.querySelector(".site-header nav");
  if (!nav || nav.querySelector("[data-auth-link]")) return;
  const user = getCurrentUser();
  const link = document.createElement("a");
  link.dataset.authLink = "true";
  link.className = user ? "auth-chip" : "auth-link";
  link.textContent = user ? `我的账户` : "注册/登录";
  if (user) {
    link.href = "./account.html";
    const logout = document.createElement("button");
    logout.dataset.authLink = "true";
    logout.className = "auth-link";
    logout.type = "button";
    logout.textContent = "退出";
    logout.addEventListener("click", () => {
      logoutUser();
      location.reload();
    });
    nav.appendChild(link);
    nav.appendChild(logout);
    return;
  } else {
    link.href = authUrl("nav");
  }
  nav.appendChild(link);
}

function gateMarkup(title, body, reason) {
  return `
    <div class="gate-card">
      <span class="section-label">Register to unlock</span>
      <h3>${title}</h3>
      <p>${body}</p>
      <a class="button primary" href="${authUrl(reason)}" data-analytics-event="register_gate_click" data-analytics-action="${reason}">免费注册解锁</a>
    </div>
  `;
}

const authForm = document.querySelector("#authForm");
if (authForm) {
  const params = new URLSearchParams(location.search);
  const reason = params.get("reason") || "unlock";
  const notice = document.querySelector("#authReasonNotice");
  if (notice) notice.textContent = reasonCopy(reason);

  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    window.TechPulseAnalytics?.track("register_submit", {
      reason,
      interest: document.querySelector("#authInterest").value,
      next: params.get("next") || "",
    });
    registerUser({
      email: document.querySelector("#authEmail").value,
      interest: document.querySelector("#authInterest").value,
    });
    const pendingPlan = pendingPlanFromReason(reason);
    if (pendingPlan) localStorage.setItem(PENDING_PLAN_KEY, pendingPlan);
    location.href = safeNextUrl(params.get("next"));
  });
}

renderAuthNav();

window.TechPulseAuth = {
  getCurrentUser,
  isRegistered,
  registerUser,
  logoutUser,
  authUrl,
  safeNextUrl,
  gateMarkup,
  renderAuthNav,
};
