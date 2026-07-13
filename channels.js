const channelBoard = document.querySelector("#channelBoard");
const channelSummary = document.querySelector("#channelSummary");
const categoryFilter = document.querySelector("#categoryFilter");
const channelSearch = document.querySelector("#channelSearch");
const sourceQuality = document.querySelector("#sourceQuality");

let channels = [];
let channelTestResults = new Map();
let channelTestMeta = null;

function normalizeFromSiteData(channel) {
  return {
    channelId: channel.channelId || channel.name.toLowerCase().replaceAll(" ", "-"),
    name: channel.name,
    category: channel.category || (channel.type?.includes("AI") ? "AI" : channel.type?.includes("评测") ? "Review" : "Platform"),
    handle: channel.handle || "",
    webUrl: channel.webUrl || "",
  };
}

async function loadChannels() {
  try {
    const response = await fetch("./pipeline/channels.sample.json", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      return data.filter((channel) => (channel.status || "active") === "active");
    }
  } catch {}

  return (window.TechPulseData.channels || []).map(normalizeFromSiteData);
}

async function loadChannelTests() {
  try {
    const response = await fetch("./pipeline/channel-tests.json", { cache: "no-store" });
    if (!response.ok) return { meta: null, results: new Map() };
    const data = await response.json();
    return {
      meta: data,
      results: new Map((data.results || []).map((item) => [item.channelId, item])),
    };
  } catch {
    return { meta: null, results: new Map() };
  }
}

function sourceType(category) {
  if (category === "AI") return "AI 官方与研究者";
  if (category === "Review" || category === "Devices") return "数码与综合科技评测";
  return "平台与开发者生态";
}

function categoryLabel(category) {
  if (category === "AI") return "AI";
  if (category === "Platform") return "平台生态";
  if (category === "Devices") return "数码硬件";
  if (category === "Review") return "科技评测";
  return category;
}

function renderCategoryOptions() {
  const categories = [...new Set(channels.map((channel) => channel.category))].sort();
  const selected = categoryFilter.value || "all";
  categoryFilter.innerHTML = [
    '<option value="all">全部来源</option>',
    ...categories.map((category) => `<option value="${category}">${categoryLabel(category)}</option>`),
  ].join("");
  categoryFilter.value = categories.includes(selected) ? selected : "all";
}

function filteredChannels() {
  const category = categoryFilter.value;
  const query = channelSearch.value.trim().toLowerCase();

  return channels.filter((channel) => {
    const matchesCategory = category === "all" || channel.category === category;
    const text = [channel.name, channel.handle, channel.category].join(" ").toLowerCase();
    return matchesCategory && (!query || text.includes(query));
  });
}

function totalRecentVideos() {
  return [...channelTestResults.values()].reduce((sum, result) => sum + Number(result.videoCount || 0), 0);
}

function todayFeaturedSources() {
  return new Set((window.TechPulseData.videos || []).map((video) => video.channel).filter(Boolean)).size;
}

function renderSummary(visibleChannels) {
  const categoryCount = new Set(channels.map((channel) => channel.category)).size;
  const okCount = channelTestMeta?.okCount ?? [...channelTestResults.values()].filter((result) => result.ok).length;

  channelSummary.innerHTML = [
    ["覆盖来源", channels.length],
    ["来源类别", categoryCount],
    ["近期视频", totalRecentVideos() || "更新中"],
    ["可用来源", okCount || "更新中"],
    ["今日入榜来源", todayFeaturedSources() || "更新中"],
  ]
    .map(([label, value]) => `<article><span>${label}</span><b>${value}</b></article>`)
    .join("");

  if (visibleChannels.length !== channels.length) {
    channelSummary.insertAdjacentHTML("beforeend", `<article><span>当前显示</span><b>${visibleChannels.length}</b></article>`);
  }
}

function formatDateTime(iso) {
  if (!iso) return "持续更新";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

function renderSourceQuality() {
  const okCount = channelTestMeta?.okCount;
  const count = channelTestMeta?.count || channels.length;
  const recentHours = channelTestMeta?.recentHours || 168;
  const generatedAt = formatDateTime(channelTestMeta?.generatedAt);

  sourceQuality.innerHTML = `
    <article>
      <div>
        <span class="section-label">Source Quality</span>
        <h2>${okCount ? `${okCount}/${count} 个来源近期可用` : "来源池持续巡检中"}</h2>
        <p>最近巡检：${generatedAt} · 观察窗口 ${recentHours} 小时。少量来源可能因发布节奏或 YouTube 抓取延迟暂时没有新内容，不影响每日热榜筛选。</p>
      </div>
      <a class="button secondary" href="./search.html" data-analytics-event="source_search_click" data-analytics-action="channels_quality">搜索历史话题</a>
    </article>
  `;
}

function renderSample(channel) {
  const result = channelTestResults.get(channel.channelId);
  if (!result?.ok) return "近期内容等待下一轮同步";
  return result.sampleVideos?.[0]?.title || "近期有可用内容";
}

function renderChannels() {
  const visibleChannels = filteredChannels();
  renderSummary(visibleChannels);
  renderSourceQuality();

  if (!visibleChannels.length) {
    channelBoard.innerHTML = '<div class="empty-state"><h3>没有匹配来源</h3><p>换一个关键词或选择全部来源再试。</p></div>';
    return;
  }

  const grouped = visibleChannels.reduce((acc, channel) => {
    const type = sourceType(channel.category);
    acc[type] = acc[type] || [];
    acc[type].push(channel);
    return acc;
  }, {});

  channelBoard.innerHTML = Object.entries(grouped)
    .map(
      ([type, groupChannels]) => `
        <section class="channel-group">
          <div>
            <span class="section-label">${type}</span>
            <h2>${groupChannels.length} 个内容来源</h2>
          </div>
          <div class="channel-table public-channel-table">
            ${groupChannels
              .map(
                (channel) => `
                  <article>
                    <div>
                      <strong>${channel.name}</strong>
                      <p>${channel.handle || channel.webUrl || "官方频道"} · ${categoryLabel(channel.category)}</p>
                      <p class="channel-test-result">${renderSample(channel)}</p>
                    </div>
                    <a class="button compact secondary" href="${channel.webUrl || `https://www.youtube.com/${channel.handle}/videos`}" target="_blank" rel="noreferrer" data-analytics-event="source_channel_click" data-analytics-action="channels_list" data-channel="${channel.name}" data-category="${channel.category}">查看来源</a>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `
    )
    .join("");
}

[categoryFilter, channelSearch].forEach((control) => {
  control.addEventListener("input", renderChannels);
});

Promise.all([loadChannels(), loadChannelTests()]).then(([loadedChannels, loadedTests]) => {
  channels = loadedChannels;
  channelTestMeta = loadedTests.meta;
  channelTestResults = loadedTests.results;
  renderCategoryOptions();
  renderChannels();
});
