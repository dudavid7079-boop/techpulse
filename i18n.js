(function () {
  const STORAGE_KEY = "techpulse-language";
  const SUPPORTED = new Set(["zh-CN", "en"]);
  const textMemory = new WeakMap();
  let currentLanguage = localStorage.getItem(STORAGE_KEY) || new URLSearchParams(location.search).get("lang") || "zh-CN";
  if (!SUPPORTED.has(currentLanguage)) currentLanguage = "zh-CN";

  const dictionary = {
    "科技脉动": "Tech Pulse",
    "TechPulse · 科技脉动": "TechPulse",
    "主导航": "Main navigation",
    "TechPulse 首页": "TechPulse home",
    "产品雷达": "Product Radar",
    "视频热榜": "Video Trends",
    "搜索": "Search",
    "话题库": "Topics",
    "算法": "Method",
    "来源": "Sources",
    "会员": "Membership",
    "订阅": "Subscribe",
    "我的账户": "My Account",
    "注册/登录": "Sign up / Log in",
    "退出": "Log out",
    "每天 8 点，看透全球 AI 产品信号。": "See global AI product signals every day at 8.",
    "TechPulse 同步全球科技，AI一触即达。": "TechPulse tracks global tech and brings AI signals within reach.",
    "TechPulse 2.0 把海外视频情报升级为 AI 产品雷达：围绕产品实体聚合视频摘要、社区讨论、GitHub 生态和趋势信号， 帮中文用户判断一个产品是否值得试用、跟进或纳入竞品研究。": "TechPulse 2.0 upgrades overseas video intelligence into an AI product radar: each product entity brings together video summaries, community debates, GitHub ecosystem signals, and trend signals so users can decide what is worth trying, tracking, or researching.",
    "查看产品雷达": "View Product Radar",
    "查看视频热榜": "View Video Trends",
    "了解聚合算法": "How the Radar Works",
    "今日聚合状态": "Today's aggregation status",
    "视频话题": "Video topics",
    "产品实体": "Product entities",
    "指标同步": "Metric sync",
    "字中文摘要": "Chinese summary",
    "今日雷达把视频证明、开发者讨论和产品信号合并到同一张情报卡里，优先判断产品价值而不是单纯追视频播放。": "Today's radar combines video proof, developer discussions, and product signals into one intelligence card, focusing on product value instead of raw views.",
    "RSS 轮询": "RSS polling",
    "官方嵌入播放 + 备用线路监控": "Official embeds + backup route monitoring",
    "从“看视频”升级为“看产品”。": "From watching videos to understanding products.",
    "每个产品实体都汇总视频证明、Hacker News 讨论、GitHub 技术生态和风险判断。当前 GitHub 与 HN 信号已接入，Product Hunt API 暂缓。": "Each product entity combines video proof, Hacker News discussion, GitHub ecosystem signals, and risk notes. GitHub and HN are connected; Product Hunt API is paused for now.",
    "打开完整产品雷达": "Open full Product Radar",
    "今日海外科技 & AI 视频证明": "Today's overseas tech & AI video proof",
    "分类": "Category",
    "全部": "All",
    "数码硬件": "Devices",
    "平台生态": "Platform",
    "评测": "Reviews",
    "排序": "Sort",
    "热度评分": "Signal score",
    "发布时间": "Publish time",
    "讨论量": "Comments",
    "关键词": "Keywords",
    "推送渠道": "Delivery channel",
    "进入订阅中心": "Open Subscription Center",
    "选择一个话题开始播放": "Select a topic to start",
    "默认使用 YouTube 官方 no-cookie 嵌入播放；自建 Invidious 备用线路通过健康检查后开放。": "By default TechPulse uses YouTube's official no-cookie embed; the self-hosted Invidious backup route opens after health checks.",
    "备用线路检测中": "Checking backup route",
    "备用线路待检测": "Backup route pending",
    "备用线路维护中": "Backup route under maintenance",
    "备用线路播放": "Play via backup route",
    "YouTube 原站": "YouTube original",
    "AI 中文快报摘要": "AI Chinese briefing summary",
    "点击左侧热榜卡片后，这里会展示 300 字结构化中文摘要、关键时间点和关联参考视频。": "After you select a trending card, this area shows a structured summary, key moments, and related references.",
    "不用 Trending API，也能低成本筛出每日 Top 20。": "Find the daily Top 20 without relying on the Trending API.",
    "站点采用“定向来源池监控 + 数据加权清洗 + AI 话题归纳”。RSS 负责发现，Data API 只查询候选视频， 最后用半衰期热度公式和大模型聚类减少重复评测占屏。": "The site uses a focused source pool, weighted cleanup, and AI topic clustering. RSS discovers candidates, the Data API only enriches shortlisted videos, and a decay formula plus clustering reduces duplicates.",
    "订阅你关心的创作者，新视频自动推送。": "Subscribe to creators you care about and receive new videos automatically.",
    "网页端保存订阅偏好，后续可接 Telegram Bot、企业微信或微信服务号，把新视频、中文摘要和关键时间点推给用户。": "The web app stores subscription preferences and can later connect Telegram, WeCom, or WeChat service messages to push new videos, summaries, and key moments.",
    "搜索产品、话题和关键词": "Search products, topics, and keywords",
    "热榜解决“今天看什么”，搜索页解决“我想追踪某个模型、产品、仓库或创作者”。": "The trending page answers what to watch today; search helps you track a model, product, repository, or creator.",
    "没有找到结果": "No results found",
    "试试 Cursor、Claude Code、MCP、OpenAI、Phone 或 Workspace。": "Try Cursor, Claude Code, MCP, OpenAI, Phone, or Workspace.",
    "注册后搜索完整产品与历史归档": "Sign up to search the full product and history archive",
    "产品档案": "Product profile",
    "产品档案正在补充中。": "This product profile is still being enriched.",
    "GitHub 生态": "GitHub ecosystem",
    "生态待补充": "Ecosystem pending",
    "HN / 社区讨论": "HN / community discussion",
    "社区待补充": "Community pending",
    "等待视频证明": "Waiting for video proof",
    "AI 产品雷达": "AI Product Radar",
    "一个地方，看透一个全球 AI 产品。": "One place to understand a global AI product.",
    "围绕产品实体聚合 GitHub 仓库、Hacker News 讨论、中文视频摘要和风险判断，帮助你快速判断是否值得试用、跟进或纳入竞品研究。": "Each product profile combines GitHub repositories, Hacker News discussions, Chinese video summaries, and risk notes to help you decide whether to try, track, or research it.",
    "当前数据源": "Current sources",
    "当前 MVP 暂不接 Product Hunt API，优先保证工程师社区和源码生态可读。": "This MVP does not connect the Product Hunt API yet; it prioritizes developer community and source-code signals.",
    "产品雷达摘要": "Product radar summary",
    "当前产品雷达覆盖数": "Current product radar coverage",
    "已关注": "Following",
    "可从产品卡片开始关注": "Start following from any product card",
    "订阅中心会自动带入关键词": "The subscription center will prefill keywords",
    "最高信号": "Top signal",
    "等待数据生成": "Waiting for data",
    "证据缺口": "Evidence gaps",
    "核心产品证据完整": "Core product evidence is complete",
    "AI 产品列表": "AI product list",
    "全部分类": "All categories",
    "只看已关注": "Only followed",
    "没有匹配产品": "No matching products",
    "换个关键词，或关闭“只看已关注”。": "Try another keyword or turn off only-followed.",
    "没有匹配的产品档案": "No matching product profiles",
    "可以清空搜索、切换分类，或先取消“只看已关注”。TechPulse 会在后续刷新中继续扩展产品实体库。": "Clear the search, switch categories, or disable only-followed. TechPulse will keep expanding the product entity library.",
    "关注信号": "Follow signal",
    "关注产品信号": "Follow product signal",
    "已关注该产品": "Following product",
    "订阅关键词": "Subscribe keywords",
    "查看档案": "View profile",
    "查看视频摘要": "View video summary",
    "3 秒看懂": "3-second take",
    "源码生态与项目活跃度": "Source ecosystem and activity",
    "工程师社区讨论": "Engineer community discussion",
    "海外视频情报摘要": "Overseas video intelligence summary",
    "大陆可读模式优先展示中文摘要和关键点；原视频仅作为来源链接。": "Mainland-readable mode prioritizes summaries and key points; original videos are source links.",
    "适合谁": "Best for",
    "不适合谁": "Not for",
    "主要风险": "Key risks",
    "社区讨论": "Community discussion",
    "视频证明": "Video proof",
    "新鲜度": "Freshness",
    "已有可读中文视频摘要，可作为产品实机证明。": "Readable video summaries are available as product demo evidence.",
    "等待下一轮视频同步。": "Waiting for the next video sync.",
    "按最近 24-72 小时新增信号加权。": "Weighted by signals added in the last 24-72 hours.",
    "内容来源": "Content Sources",
    "TechPulse 优先覆盖海外 AI 官方频道、开发者平台、科技媒体和数码评测创作者，用统一规则筛选值得中文用户关注的每日话题。": "TechPulse prioritizes overseas AI official channels, developer platforms, tech media, and review creators, then applies one ranking method to surface daily topics worth following.",
    "来源池会持续扩展，但只有能稳定产出高质量海外科技内容的频道才会进入每日候选。系统会结合发布时间、讨论热度、频道类型和主题重复度，筛出适合中文用户快速阅读的 Top 20。": "The source pool will keep expanding, but only channels that consistently produce high-quality overseas tech content enter the daily candidates. The system combines publish time, discussion heat, channel type, and topic duplication to select the Top 20.",
    "订阅每日摘要": "Subscribe to daily digest",
    "全部来源": "All sources",
    "覆盖来源": "Covered sources",
    "来源类别": "Source categories",
    "近期视频": "Recent videos",
    "可用来源": "Available sources",
    "今日入榜来源": "Sources in today's list",
    "当前显示": "Showing",
    "搜索历史话题": "Search historical topics",
    "没有匹配来源": "No matching sources",
    "换一个关键词或选择全部来源再试。": "Try another keyword or choose all sources.",
    "查看来源": "View source",
    "近期内容等待下一轮同步": "Recent content is waiting for the next sync",
    "近期有可用内容": "Recent content is available",
    "官方频道": "Official channel",
    "会员方案": "Membership Plans",
    "免费版覆盖每日科技重点；专业版适合高频搜索、关键词监控和周报总结；团队版面向需要共享情报流与内部同步的团队。": "Free covers daily tech highlights; Pro is for frequent search, keyword monitoring, and weekly reports; Team is for shared intelligence workflows.",
    "订阅中心": "Subscription Center",
    "订阅产品信号与每日科技快报": "Subscribe to product signals and daily tech briefings",
    "选择你关注的 AI 产品、关键词和推送时间。TechPulse 会把海外产品信号、视频摘要和社区争议整理成中文快报。": "Choose AI products, keywords, and delivery time. TechPulse turns overseas product signals, video summaries, and community debates into a daily briefing.",
    "保存订阅偏好": "Save subscription preferences",
    "保存后可在“我的账户”查看订阅偏好。": "After saving, you can review subscription preferences in My Account.",
    "查看会员方案": "View membership plans",
    "登录后查看你的科技快报账户": "Log in to view your TechPulse briefing account",
    "注册后可以保存订阅偏好、查看完整摘要和历史搜索结果。": "After signing up, you can save subscriptions, read full summaries, and view historical search results.",
    "修改订阅": "Edit subscription",
    "设置订阅": "Set up subscription",
    "查看方案": "View plans",
    "去产品雷达": "Go to Product Radar",
    "查看话题详情": "View topic details",
    "注册解锁": "Sign up to unlock",
    "观看": "Views",
    "点赞": "Likes",
    "评论": "Comments",
    "质量分": "Quality",
    "关键时间点": "Key moments",
    "为什么值得看": "Why it matters",
    "关联参考视频": "Related videos",
    "注册后查看完整话题分析": "Sign up to view the full topic analysis",
    "注册后查看完整关键时间点目录": "Sign up to view all key moments",
    "注册后查看关联参考视频": "Sign up to view related videos",
    "用于对比多个创作者对同一话题的观点": "Compare how multiple creators discuss the same topic",
    "自动刷新成功": "Auto refresh OK",
    "自动刷新失败": "Auto refresh failed",
    "刷新延迟": "Refresh delayed",
    "每日 08:05 UTC": "Daily at 08:05 UTC",
    "已回滚上一版": "Previous release restored",
    "来源持续巡检": "Sources monitored continuously",
    "部分来源等待更新": "Some sources pending",
    "来源状态": "Source status",
    "Pipeline 生成数据": "Pipeline-generated data",
    "Demo 演示数据": "Demo data",
    "YouTube API 精准指标": "YouTube API metrics",
    "估算预览指标": "Estimated preview metrics",
    "静态数据": "Static data",
    "完整中文摘要": "Full Chinese summary",
    "时间点": "Timeline",
    "搜索完整历史归档": "Full historical search archive",
    "保存频道和关键词订阅": "Save channel and keyword subscriptions"
  };

  const attrDictionary = {
    "产品、分类、关键词": "Product, category, keyword",
    "频道名、handle、ID": "Channel name, handle, ID",
    "Ask Google or type a URL": "Ask Google or type a URL"
  };

  const regexRules = [
    [/^(\d+)\s*条视频证明$/, "$1 video proofs"],
    [/^(\d+)\s*个内容来源$/, "$1 content sources"],
    [/^(\d+)\/(\d+)\s*个来源近期可用$/, "$1/$2 sources recently available"],
    [/^最近巡检：(.+?) · 观察窗口 (\d+) 小时。少量来源可能因发布节奏或 YouTube 抓取延迟暂时没有新内容，不影响每日热榜筛选。$/, "Last check: $1 · $2-hour window. A few sources may temporarily have no new content due to publishing cadence or YouTube fetch delays; this does not affect daily ranking."],
    [/^(.+?) · Score (\d+)$/, "$1 · Score $2"],
    [/^(.+?) · (\d+(?:\.\d+)?)h ago$/, "$1 · $2h ago"],
    [/^Score ([\d.KM]+)$/, "Score $1"],
    [/^(\d+(?:\.\d+)?)h ago$/, "$1h ago"],
    [/^(\d+) 小时前$/, "$1 hours ago"],
    [/^(\d+) 天前$/, "$1 days ago"],
    [/^(.+?) · 已回滚上一版$/, "$1 · previous release restored"],
    [/^最近刷新 (.+)$/, "Last refreshed $1"],
    [/^(.+?) · 最近刷新 (.+)$/, "$1 · last refreshed $2"],
    [/^(.+?) 来源可用$/, "$1 sources available"],
    [/^这条来自 (.+?) 的视频正在获得较高互动。当前热度分为 ([\d.KM]+)，适合进入今日中文快报候选。正式版本会替换为字幕驱动的大模型摘要。$/, "This video from $1 is gaining strong engagement. Its current heat score is $2, making it a good candidate for today's briefing. A transcript-driven AI summary will replace this placeholder."],
    [/^(\d\d:\d\d) 今日话题背景$/, "$1 Topic context"],
    [/^(\d\d:\d\d) 关键产品\/技术变化$/, "$1 Key product / technical changes"],
    [/^(\d\d:\d\d) 海外创作者观点$/, "$1 Overseas creator view"],
    [/^(\d\d:\d\d) 中文用户需要关注什么$/, "$1 Why Chinese-speaking users should care"]
  ];

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function translateText(value) {
    const normalized = normalize(value);
    if (!normalized) return value;
    if (dictionary[normalized]) return value.replace(normalized, dictionary[normalized]);
    for (const [pattern, replacement] of regexRules) {
      if (pattern.test(normalized)) return value.replace(normalized, normalized.replace(pattern, replacement));
    }
    return value;
  }

  function rememberText(node) {
    if (!textMemory.has(node)) textMemory.set(node, node.nodeValue);
    return textMemory.get(node);
  }

  function translateTextNode(node) {
    const original = rememberText(node);
    node.nodeValue = currentLanguage === "en" ? translateText(original) : original;
  }

  function translateAttribute(element, attr) {
    if (!element.hasAttribute(attr)) return;
    const key = `data-i18n-original-${attr}`;
    if (!element.hasAttribute(key)) element.setAttribute(key, element.getAttribute(attr));
    const original = element.getAttribute(key);
    const translated = attrDictionary[original] || translateText(original);
    element.setAttribute(attr, currentLanguage === "en" ? translated : original);
  }

  function walk(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!normalize(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "CODE", "TEXTAREA"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);

    const elements = root.querySelectorAll ? root.querySelectorAll("[placeholder], [aria-label], [title], meta[content]") : [];
    elements.forEach((element) => ["placeholder", "aria-label", "title", "content"].forEach((attr) => translateAttribute(element, attr)));
  }

  function updateToggle(button) {
    button.textContent = currentLanguage === "en" ? "中文" : "EN";
    button.setAttribute("aria-label", currentLanguage === "en" ? "Switch to Chinese" : "Switch to English");
    button.setAttribute("type", "button");
  }

  function ensureToggle() {
    document.querySelectorAll(".site-header nav").forEach((nav) => {
      if (nav.querySelector(".language-toggle")) return;
      const button = document.createElement("button");
      button.className = "language-toggle";
      updateToggle(button);
      button.addEventListener("click", () => {
        currentLanguage = currentLanguage === "en" ? "zh-CN" : "en";
        localStorage.setItem(STORAGE_KEY, currentLanguage);
        apply();
      });
      nav.appendChild(button);
    });
  }

  function apply() {
    document.documentElement.lang = currentLanguage;
    walk(document.documentElement);
    document.querySelectorAll(".language-toggle").forEach(updateToggle);
  }

  function observe() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
          if (node.nodeType === Node.ELEMENT_NODE) walk(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    ensureToggle();
    apply();
    observe();
    window.TechPulseI18n = {
      get language() {
        return currentLanguage;
      },
      setLanguage(language) {
        if (!SUPPORTED.has(language)) return;
        currentLanguage = language;
        localStorage.setItem(STORAGE_KEY, currentLanguage);
        apply();
      },
      t: translateText
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
