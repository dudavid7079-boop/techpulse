const notice = document.querySelector("#waitlistNotice");
const pendingPlanKey = "techpulse-pending-plan";

function waitlist() {
  return JSON.parse(localStorage.getItem("techpulse-waitlist") || "[]");
}

function saveWaitlist(items) {
  localStorage.setItem("techpulse-waitlist", JSON.stringify(items));
}

function addPlanToWaitlist(plan) {
  const items = waitlist();
  if (!items.some((item) => item.plan === plan)) {
    items.push({
      plan,
      joinedAt: new Date().toISOString(),
    });
    saveWaitlist(items);
  }
  return items;
}

function syncPlanButtons() {
  const items = waitlist();
  document.querySelectorAll("[data-plan]").forEach((button) => {
    if (items.some((item) => item.plan === button.dataset.plan)) {
      button.textContent = "已加入等待名单";
      button.classList.add("subscribed");
    }
  });
}

function renderNotice() {
  const items = waitlist();
  if (!items.length) {
    notice.innerHTML = `<p class="muted-note">加入 Pro 或 Team 等待名单后，可在“我的账户”查看状态。</p>`;
    return;
  }
  notice.innerHTML = `
    <div class="waitlist-box">
      <strong>已加入等待名单</strong>
      <span>${items.map((item) => item.plan.toUpperCase()).join(" / ")}</span>
    </div>
  `;
}

document.querySelectorAll("[data-plan]").forEach((button) => {
  button.addEventListener("click", () => {
    window.TechPulseAnalytics?.track("pricing_plan_select", {
      plan: button.dataset.plan,
      registered: window.TechPulseAuth.isRegistered(),
    });
    if (!window.TechPulseAuth.isRegistered()) {
      location.href = window.TechPulseAuth.authUrl(`${button.dataset.plan}-waitlist`);
      return;
    }

    addPlanToWaitlist(button.dataset.plan);
    syncPlanButtons();
    renderNotice();
  });
});

function consumePendingPlan() {
  if (!window.TechPulseAuth.isRegistered()) return;
  const plan = localStorage.getItem(pendingPlanKey);
  if (!plan) return;
  localStorage.removeItem(pendingPlanKey);
  addPlanToWaitlist(plan);
}

consumePendingPlan();
syncPlanButtons();
renderNotice();
