# TechPulse · 科技脉动 Pipeline Prototype

这个目录是后端自动化 Pipeline 的雏形，先服务于工程设计和本地验证。

## 文件

- `channels.sample.json`：频道池样例。
- `candidates.sample.json`：候选视频指标样例。
- `score-topics.mjs`：热度半衰期评分脚本。
- `discover-rss.mjs`：新视频发现脚本，优先读取 YouTube RSS；RSS 失效时回退解析频道 `/videos` 页面拿真实 videoId。
- `discovered-to-candidates.mjs`：把频道页发现结果转换为可预览的候选指标；保留为调试工具。
- `sync-metrics.mjs`：候选指标同步脚本；有 `YOUTUBE_API_KEY` 时调用 YouTube Data API，无 key 时输出估算指标。
- `test-channel.mjs`：频道可用性测试脚本，检查 RSS / 频道页 fallback 能否发现近期视频。
- `build-digest.mjs`：每日快报 JSON 生成脚本。
- `push-digest.mjs`：Telegram 推送脚本，未配置 token 时打印预览。
- `export-site-data.mjs`：把每日快报导出为前端可读的 `data.generated.js`。
- `run-local-demo.mjs`：串起本地演示链路。
- `run-real-preview.mjs`：串起真实频道页预览链路，不需要 YouTube API key。
- `job-status.json`：最近一次真实 Pipeline 运行状态，由 `run-real-preview.mjs` 自动生成。
- `channel-tests.json`：最近一次频道可用性测试结果，由 `test-channel.mjs` 自动生成。
- `cluster-prompt.md`：AI 话题聚类 Prompt。

## 本地运行

在 `youtube-ai-tech-aggregator` 目录下执行：

```bash
node pipeline/score-topics.mjs pipeline/candidates.sample.json
RSS_RECENT_HOURS=72 node pipeline/discover-rss.mjs pipeline/channels.sample.json pipeline/discovered.real.json
node pipeline/sync-metrics.mjs pipeline/discovered.real.json pipeline/candidates.real.json
node pipeline/build-digest.mjs pipeline/candidates.sample.json pipeline/daily-digest.sample.json
node pipeline/export-site-data.mjs pipeline/daily-digest.sample.json pipeline/candidates.sample.json pipeline/channels.sample.json data.generated.js
node pipeline/push-digest.mjs pipeline/daily-digest.sample.json
```

## 真实 Pipeline

一键生成真实频道池热榜：

```bash
RSS_RECENT_HOURS=168 node pipeline/run-real-preview.mjs
```

若配置了 `YOUTUBE_API_KEY`，`sync-metrics.mjs` 会用 YouTube Data API 获取精准 `viewCount / likeCount / commentCount / publishedAt`。若未配置，则自动输出 `web-estimated` 或 `rss-baseline-estimated` 预览指标。

这会生成：

- `pipeline/discovered.real.json`
- `pipeline/candidates.real.json`
- `pipeline/daily-digest.real.json`
- `pipeline/job-status.json`
- `data.generated.js`

然后访问 `index.html?source=generated` 预览生成榜单，访问 `admin.html?source=generated` 查看最近一次 Pipeline 状态。

## 频道测试

测试全部频道：

```bash
RSS_RECENT_HOURS=168 node pipeline/test-channel.mjs pipeline/channels.sample.json pipeline/channel-tests.json
```

测试单个频道：

```bash
CHANNEL_QUERY=OpenAI node pipeline/test-channel.mjs pipeline/channels.sample.json pipeline/channel-tests.json
```

频道库页会读取 `pipeline/channel-tests.json`，展示最近一次测试来源、发现视频数和样例标题。

## 后续真实任务

1. `discover-rss.mjs`：读取频道 RSS；若官方 RSS 返回 404/500，则解析频道页面作为候选发现 fallback。
2. `sync-metrics.mjs`：有 key 时调用 YouTube Data API v3 的 `videos:list`；无 key 时生成预览估算指标。
3. `discovered-to-candidates.mjs`：备用调试工具，可单独把发现结果转换为估算候选。
4. `fetch-transcripts.mjs`：拉取字幕轨道。
5. `summarize.mjs`：调用 Qwen/DeepSeek 生成中文摘要。
6. `cluster-topics.mjs`：调用大模型进行话题聚类。
7. `push-digest.mjs`：推送 Telegram / 企业微信 / 邮件。
