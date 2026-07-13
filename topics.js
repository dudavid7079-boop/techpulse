const { videos } = window.TechPulseData;
const { scoreVideo, formatNumber } = window.TechPulseUtils;
const playbackConfig = window.TechPulsePlayback || {};

const directory = document.querySelector("#topicDirectory");
const detail = document.querySelector("#topicDetail");
let invidiousStatus = null;

async function readJson(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
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

function routeActions(videoId) {
  const video = videos.find((item) => item.videoId === videoId);
  const invidiousButton = isInvidiousHealthy()
    ? `<a class="button primary" href="${invidiousWatchUrl(videoId)}" target="_blank" rel="noreferrer" data-analytics-event="video_backup_route_click" data-analytics-action="topic_detail" data-video-id="${videoId}" data-channel="${video?.channel || ""}" data-category="${video?.category || ""}">备用线路播放</a>`
    : `<a class="button primary disabled" href="#" aria-disabled="true">${
        invidiousStatus?.status === "unhealthy" ? "备用线路维护中" : "备用线路待检测"
      }</a>`;

  return `
    ${invidiousButton}
    <a class="button secondary" href="${youtubeWatchUrl(videoId)}" target="_blank" rel="noreferrer" data-analytics-event="video_original_click" data-analytics-action="topic_detail" data-video-id="${videoId}" data-channel="${video?.channel || ""}" data-category="${video?.category || ""}">YouTube 原站</a>
  `;
}

function sortedVideos() {
  return [...videos].map((video) => ({ ...video, score: scoreVideo(video) })).sort((a, b) => b.score - a.score);
}

function renderDirectory(activeId) {
  directory.innerHTML = `
    <span class="section-label">Top Candidates</span>
    ${sortedVideos()
      .map(
        (video, index) => `
          <button class="${video.videoId === activeId ? "active" : ""}" data-video-id="${video.videoId}">
            <b>${String(index + 1).padStart(2, "0")}</b>
            <span>${video.topic}${!window.TechPulseAuth.isRegistered() && index > 2 ? " · 注册解锁" : ""}</span>
          </button>
        `
      )
      .join("")}
  `;
}

function renderDetail(videoId) {
  const allVideos = sortedVideos();
  const video = allVideos.find((item) => item.videoId === videoId) || allVideos[0];
  const rank = allVideos.findIndex((item) => item.videoId === video.videoId);
  const locked = !window.TechPulseAuth.isRegistered() && rank > 2;
  const related = allVideos.filter((item) => item.videoId !== video.videoId && item.category === video.category).slice(0, 3);
  renderDirectory(video.videoId);

  detail.innerHTML = `
    <div class="detail-video">
      <iframe
        title="${video.topic}"
        src="${officialEmbedUrl(video.videoId)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
    <div class="detail-body">
      <div class="topic-meta">
        <span>${video.category}</span>
        <span>${video.channel}</span>
        <span>Score ${formatNumber(video.score)}</span>
        <span>${video.publishedHours.toFixed(1)}h ago</span>
      </div>
      <h2>${video.topic}</h2>
      <p class="lead">${locked ? `${video.summary.slice(0, 68)}...` : video.summary}</p>
      <div class="insight-grid">
        <div><b>${formatNumber(video.views)}</b><span>观看</span></div>
        <div><b>${formatNumber(video.likes)}</b><span>点赞</span></div>
        <div><b>${formatNumber(video.comments)}</b><span>评论</span></div>
        <div><b>${video.quality}</b><span>质量分</span></div>
      </div>
      ${
        locked
          ? window.TechPulseAuth.gateMarkup(
              "注册后查看完整话题分析",
              "未注册用户每天可完整查看前 3 个精选话题。注册后解锁全部 Top 20、完整 300 字中文摘要、关键时间点和关联参考视频。",
              "topic-detail"
            )
          : ""
      }
      <h3>关键时间点</h3>
      <ul class="chapter-list">${
        locked ? `<li>注册后查看完整关键时间点目录</li>` : video.chapters.map((chapter) => `<li>${chapter}</li>`).join("")
      }</ul>
      <h3>为什么值得看</h3>
      <p>${locked ? "这部分属于深度解读。注册后可查看热度来源、适合人群、技术重点和关联参考视频。" : "该视频在频道权威性、互动密度和发布时间衰减后仍保持高分，说明它不是单纯靠历史订阅量撑起来的内容，而是正在形成真实讨论。适合作为今日中文快报的主推荐视频。"}</p>
      <h3>关联参考视频</h3>
      <div class="related-grid">
        ${
          locked
            ? `<article class="locked-related"><strong>注册后查看关联参考视频</strong><span>用于对比多个创作者对同一话题的观点</span></article>`
            : related
                .map(
                  (item) => `
              <a href="./topics.html?id=${item.videoId}" data-analytics-event="related_topic_click" data-analytics-action="topic_detail" data-video-id="${item.videoId}" data-channel="${item.channel}" data-category="${item.category}">
                <span>${item.channel}</span>
                <strong>${item.topic}</strong>
              </a>
            `
                )
                .join("")
        }
      </div>
      <div class="route-actions detail-actions">
        ${routeActions(video.videoId)}
      </div>
    </div>
  `;
}

directory.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  history.replaceState(null, "", `./topics.html?id=${button.dataset.videoId}`);
  window.TechPulseAnalytics?.track("topic_directory_click", { videoId: button.dataset.videoId });
  renderDetail(button.dataset.videoId);
});

const initialId = new URLSearchParams(location.search).get("id");

readJson(playbackConfig.statusPath || "./pipeline/invidious-status.json").then((status) => {
  invidiousStatus = status;
  renderDetail(initialId);
});
