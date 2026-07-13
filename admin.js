const { videos } = window.TechPulseData;
const { scoreVideo, formatNumber } = window.TechPulseUtils;
const productState = window.TechPulseProducts || { products: [] };
const dataSourceDescription = document.querySelector("#dataSourceDescription");
const jobList = document.querySelector("#jobList");
const productOpsGrid = document.querySelector("#productOpsGrid");

if (dataSourceDescription) {
  dataSourceDescription.textContent =
    window.TechPulseDataSource === "generated"
      ? `当前使用 Pipeline 生成数据。生成时间：${window.TechPulseData.generatedAt || "未知"}。`
      : "当前使用手写 Demo 数据，适合产品演示和 UI 调整。";
}

const fallbackJobs = [
  ["RSS Discovery", "每 2 小时", "最近成功", "发现 17 条近 24 小时新视频"],
  ["YouTube Metrics Sync", "每 6 小时", "等待下次运行", "候选池 40 条，预计消耗 1 个批量请求"],
  ["Subtitle Fetch", "异步队列", "部分重试", "3 条视频缺少英文字幕轨道"],
  ["AI Topic Clustering", "每天 08:00", "已完成", "40 条候选合并为 20 个核心话题"],
  ["Telegram Digest", "每天 08:30", "待发送", "订阅用户分组推送准备中"],
];

function renderJobs(jobs) {
  jobList.innerHTML = jobs
    .map(
    ([name, cadence, status, note]) => `
      <article class="job-row">
        <div><strong>${name}</strong><p>${note}</p></div>
        <span>${cadence}</span>
        <b>${status}</b>
      </article>
    `
    )
    .join("");
}

function formatDateTime(iso) {
  if (!iso) return "未知";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

function jobsFromStatus(status) {
  if (status.status === "failed") {
    return [
      [
        "Pipeline Run",
        `${status.recentHours || 24}h 窗口`,
        "运行失败",
        `${status.failedStep || "未知步骤"} 失败，完成时间 ${formatDateTime(status.finishedAt)}。`,
      ],
      [
        "Failure Detail",
        "最近一次",
        `Exit ${status.exitCode ?? "?"}`,
        status.errorSummary || "未记录错误摘要。",
      ],
      [
        "Completed Steps",
        "本次运行",
        `${status.completedSteps?.length || 0} 个完成`,
        status.completedSteps?.join(" -> ") || "尚未完成任何步骤。",
      ],
      [
        "Recovery",
        "人工处理",
        "待重跑",
        "修复网络、API key 或输入文件后重新运行 run-real-preview.mjs。",
      ],
    ];
  }

  const modeLabel = status.mode === "youtube-api" ? "精准指标" : "估算预览";
  const sources = status.sources?.join(", ") || "unknown";
  return [
    [
      "Video Discovery",
      `${status.recentHours || 24}h 窗口`,
      status.status === "success" ? "最近成功" : "需要检查",
      `发现 ${status.discoveredCount || 0} 条候选，完成时间 ${formatDateTime(status.finishedAt)}。`,
    ],
    [
      "Metrics Sync",
      "自动路由",
      modeLabel,
      `候选 ${status.candidateCount || 0} 条，来源 ${sources}。`,
    ],
    [
      "Topic Ranking",
      "即时计算",
      "已完成",
      `生成 ${status.topicCount || 0} 条 Top 话题，重力系数 ${window.TechPulseData.gravity}。`,
    ],
    [
      "Frontend Export",
      "任务完成后",
      "已发布",
      `data.generated.js 已刷新，当前页面数据源为 ${window.TechPulseDataSource}。`,
    ],
    [
      "Notification Preview",
      "每天 08:30",
      "待配置",
      "配置 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID 后可自动推送。",
    ],
  ];
}

function productCoverage(product) {
  const videoScore = product.sourceMix?.video || 0;
  const communityScore = product.sourceMix?.community || 0;
  if (videoScore < 15) return "补视频证明";
  if (communityScore < 20) return "补社区舆情";
  if (product.signalScore >= 85) return "优先跟踪";
  return "持续观察";
}

function renderProductOps() {
  if (!productOpsGrid) return;
  const products = [...productState.products].sort((a, b) => b.signalScore - a.signalScore);
  const topProducts = products.slice(0, 5);
  const weakCoverage = products.filter((product) => (product.sourceMix?.video || 0) < 15 || (product.sourceMix?.community || 0) < 20);
  const categories = [...new Set(products.map((product) => product.category))];

  productOpsGrid.innerHTML = `
    <article>
      <span>今日重点</span>
      <b>${topProducts[0]?.name || "暂无产品"}</b>
      <p>${topProducts[0] ? `${topProducts[0].category} · Signal ${topProducts[0].signalScore} · ${topProducts[0].signalTrend} today` : "等待产品雷达数据生成。"}</p>
      <a class="detail-link" href="./products.html?id=${topProducts[0]?.id || ""}" data-analytics-event="admin_product_open_click" data-analytics-action="top_product" data-product-id="${topProducts[0]?.id || ""}">查看档案</a>
    </article>
    <article>
      <span>覆盖缺口</span>
      <b>${weakCoverage.length}</b>
      <p>${weakCoverage.length ? weakCoverage.slice(0, 3).map((product) => product.name).join(" / ") : "当前核心产品都有基础证据覆盖。"}</p>
    </article>
    <article>
      <span>分类覆盖</span>
      <b>${categories.length}</b>
      <p>${categories.join(" / ")}</p>
    </article>
    <article class="product-ops-list">
      <span>Top Signals</span>
      ${topProducts
        .map(
          (product) => `
            <a href="./products.html?id=${product.id}" data-analytics-event="admin_product_open_click" data-analytics-action="ops_list" data-product-id="${product.id}">
              <strong>${product.name}</strong>
              <small>${productCoverage(product)} · ${product.category} · ${product.signalScore}</small>
            </a>
          `
        )
        .join("")}
    </article>
  `;
}

renderJobs(fallbackJobs);
renderProductOps();

fetch("./pipeline/job-status.json", { cache: "no-store" })
  .then((response) => (response.ok ? response.json() : null))
  .then((status) => {
    if (!status) return;
    renderJobs(jobsFromStatus(status));
    if (dataSourceDescription && window.TechPulseDataSource === "generated") {
      dataSourceDescription.textContent = `当前使用 Pipeline 生成数据。最近运行：${formatDateTime(status.finishedAt)}，模式：${
        status.mode === "youtube-api" ? "YouTube API 精准指标" : "估算预览"
      }。`;
    }
  })
  .catch(() => {});

document.querySelector("#reviewList").innerHTML = [...videos]
  .map((video) => ({ ...video, score: scoreVideo(video) }))
  .sort((a, b) => b.score - a.score)
  .map(
    (video) => `
      <article class="review-row">
        <div>
          <strong>${video.topic}</strong>
          <p>${video.channel} · ${video.category} · Score ${formatNumber(video.score)}</p>
        </div>
        <span class="status-pill ${video.status}">${video.status}</span>
        <div class="review-actions">
          <button type="button">置顶</button>
          <button type="button">合并</button>
          <button type="button">隐藏</button>
        </div>
      </article>
    `
  )
  .join("");
