const { videos } = window.TechPulseData;
const { scoreVideo, formatNumber } = window.TechPulseUtils;

const queryInput = document.querySelector("#archiveQuery");
const categorySelect = document.querySelector("#archiveCategory");
const sortSelect = document.querySelector("#archiveSort");
const results = document.querySelector("#archiveResults");

function renderSearch() {
  const query = queryInput.value.trim().toLowerCase();
  const category = categorySelect.value;

  const filtered = videos
    .map((video) => ({ ...video, score: scoreVideo(video) }))
    .filter((video) => category === "all" || video.category === category)
    .filter((video) => {
      const haystack = `${video.topic} ${video.channel} ${video.summary} ${video.tags.join(" ")}`.toLowerCase();
      return !query || haystack.includes(query);
    })
    .sort((a, b) => {
      if (sortSelect.value === "recent") return a.publishedHours - b.publishedHours;
      if (sortSelect.value === "quality") return b.quality - a.quality;
      return b.score - a.score;
    });

  const locked = !window.TechPulseAuth.isRegistered() && filtered.length > 5;
  const visible = window.TechPulseAuth.isRegistered() ? filtered : filtered.slice(0, 5);

  results.innerHTML = visible.length
    ? visible
        .map(
          (video) => `
            <a class="archive-card" href="./topics.html?id=${video.videoId}" data-analytics-event="search_result_click" data-analytics-action="search_archive" data-video-id="${video.videoId}" data-channel="${video.channel}" data-category="${video.category}">
              <div>
                <span>${video.category} · ${video.channel}</span>
                <h2>${video.topic}</h2>
                <p>${video.summary}</p>
                <div class="topic-tags">${video.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
              </div>
              <aside>
                <b>${formatNumber(video.score)}</b>
                <span>Score</span>
                <small>${formatNumber(video.views)} views</small>
              </aside>
            </a>
          `
        )
        .join("") +
      (locked
        ? window.TechPulseAuth.gateMarkup(
            "注册后搜索完整历史归档",
            `未注册用户展示前 5 条结果。注册后可查看当前 ${filtered.length} 条匹配内容，并保存搜索条件。`,
            "search-archive"
          )
        : "")
    : `<article class="empty-state"><h3>没有找到结果</h3><p>试试更宽泛的关键词，比如 AI、OpenAI、Phone 或 Workspace。</p></article>`;
}

[queryInput, categorySelect, sortSelect].forEach((control) => control.addEventListener("input", renderSearch));
queryInput.addEventListener("change", () => {
  window.TechPulseAnalytics?.track("search_query_submit", {
    queryLength: queryInput.value.trim().length,
    category: categorySelect.value,
    sort: sortSelect.value,
  });
});
renderSearch();
