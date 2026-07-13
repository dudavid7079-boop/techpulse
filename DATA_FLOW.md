# 数据闭环说明

当前网站已经有两种数据模式：

1. `data.js`：手写演示数据，适合页面设计和产品演示。
2. `data.generated.js`：由 Pipeline 生成的数据，适合接真实 RSS / YouTube API 后自动更新。

## 本地演示链路

```bash
cd youtube-ai-tech-aggregator
node pipeline/run-local-demo.mjs
```

这个命令会依次执行：

1. `build-digest.mjs`：从候选视频生成每日快报 JSON。
2. `export-site-data.mjs`：把每日快报转成前端可读的 `data.generated.js`。
3. `push-digest.mjs`：打印 Telegram 推送预览。

## 真实频道页预览链路

不配置 `YOUTUBE_API_KEY` 时，可以先运行：

```bash
RSS_RECENT_HOURS=168 node pipeline/run-real-preview.mjs
```

这个命令会依次执行：

1. `discover-rss.mjs`：优先读取 YouTube RSS；RSS 失效时解析频道 `/videos` 页面。
2. `sync-metrics.mjs`：有 `YOUTUBE_API_KEY` 时同步精准指标；无 key 时把 `viewText`、`publishedText` 或 RSS 发布时间转成预览候选指标。
3. `build-digest.mjs`：生成 Top 20 话题。
4. `export-site-data.mjs`：覆盖 `data.generated.js`，供前端读取。
5. `push-digest.mjs`：打印 Telegram 推送预览，若配置 token 则推送。
6. 写入 `pipeline/job-status.json`：供运营后台展示最近一次任务状态。

预览模式可能出现两类来源：

- `web-estimated`：频道页解析到了播放量文本，点赞和评论数按保守比例估算。
- `rss-baseline-estimated`：RSS 只提供标题和发布时间，播放量、点赞、评论均按频道权重、类别和新鲜度生成基准估算。
- `youtube-api`：已通过 YouTube Data API 获取精准指标，可作为生产排序依据。

估算数据只用于页面预览和运营流程验证。生产环境配置 `YOUTUBE_API_KEY` 后，同一条 `run-real-preview.mjs` 链路会自动切换到 `youtube-api` 精准指标。

## 切换页面数据源

默认页面引用：

```html
<script src="./data-loader.js"></script>
```

可以通过 URL 切换数据源：

```text
index.html?source=demo
index.html?source=generated
```

选择会保存在浏览器 `localStorage` 中。运营后台也提供数据源切换入口。

生产环境建议由部署脚本在每日任务完成后覆盖 `data.generated.js`，页面通过 `data-loader.js` 读取生成数据。

运营后台会尝试读取 `pipeline/job-status.json`，展示最近一次 Pipeline 的运行模式、发现数量、候选数量、Top 话题数量和完成时间。读取失败时会回退到静态原型状态。

## 频道池管理

频道库页 `channels.html` 会优先读取 `pipeline/channels.sample.json`，提供分类筛选、状态筛选、搜索、权重调整、启停和 JSON 导出。当前编辑先保存在浏览器 `localStorage` 的 `techpulse-channel-draft` 中。

新增频道表单支持输入频道名、分类、YouTube handle、Channel ID 和权重：

- 只填 handle 时，会自动生成 `webUrl`，后续发现任务走频道页 fallback。
- 填写 Channel ID 时，会自动生成 RSS URL。
- handle 会自动补 `@`。
- 已存在的 handle 或 Channel ID 会被拦截，避免重复监控。

导出的频道配置包含 `status` 字段：

- `active`：正常参与发现任务。
- `paused`：`discover-rss.mjs` 会跳过该频道。

静态 MVP 阶段需要人工复制导出的 JSON 回填到频道配置文件；接入后端后可替换为服务端保存。

频道可用性测试：

```bash
RSS_RECENT_HOURS=168 node pipeline/test-channel.mjs pipeline/channels.sample.json pipeline/channel-tests.json
```

这个命令会写入 `pipeline/channel-tests.json`。频道库页会读取该文件，展示每个频道最近一次测试是否通过、使用 RSS 还是频道页 fallback、发现了多少条近期视频。

## 真实上线后的数据流

```text
channels.json
  -> discover-rss.mjs
  -> discovered videos
  -> sync-metrics.mjs (estimate / youtube-api)
  -> enriched candidates
  -> build-digest.mjs / AI clustering
  -> daily-digest.json
  -> export-site-data.mjs
  -> data.generated.js
  -> static website
```

## 下一步

- 把 `data.generated.js` 接为默认数据源。
- 用 SQLite 替代 JSON 文件。
- 增加 `job_runs` 表记录每次任务状态。
- 在后台页面读取真实任务状态，而不是静态样例。
