(function initTechPulseAnalytics() {
  let config = window.TechPulseAnalyticsConfig || {};

  function normalizeProps(props) {
    return Object.fromEntries(
      Object.entries(props || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
    );
  }

  function track(eventName, props = {}) {
    const payload = normalizeProps({
      page: location.pathname.replace(/^\//, "") || "index.html",
      source: window.TechPulseDataSource,
      ...props,
    });

    if (window.umami?.track) {
      window.umami.track(eventName, payload);
    }
  }

  function bindDelegatedClicks() {
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-analytics-event]");
      if (!target || target.getAttribute("aria-disabled") === "true" || target.classList.contains("disabled")) return;

      track(target.dataset.analyticsEvent, {
        action: target.dataset.analyticsAction,
        productId: target.dataset.productId,
        videoId: target.dataset.videoId,
        channel: target.dataset.channel,
        category: target.dataset.category,
        destination: target.href || target.dataset.destination,
        label: target.textContent.trim().slice(0, 80),
      });
    });
  }

  function loadUmami() {
    if (window.umami || !config.scriptUrl || !config.websiteId || document.querySelector("script[data-website-id]")) return;

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = config.scriptUrl;
    script.dataset.websiteId = config.websiteId;
    if (config.domains) script.dataset.domains = config.domains;
    document.head.appendChild(script);
  }

  async function loadLocalConfig() {
    try {
      const response = await fetch("./analytics-config.local.json", { cache: "no-store" });
      if (!response.ok) return;
      const localConfig = await response.json();
      config = { ...config, ...normalizeProps(localConfig) };
      loadUmami();
    } catch {}
  }

  window.TechPulseAnalytics = { track };
  bindDelegatedClicks();
  loadUmami();
  loadLocalConfig();
})();
