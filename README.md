# TechPulse · 科技脉动

独立的“海外科技 & AI 视频中文聚合平台”MVP，不改动 GlobalPilot 主站。

## 当前功能

- 每日 Top 20 热门话题列表原型
- 根据需求实现热度半衰期评分公式：
  `Score = (V + 5L + 10C) / (T + 2)^G`
- 分类、排序和搜索筛选
- 视频播放面板，默认提供 YouTube no-cookie embed；自建 Invidious 备用线路通过健康检查后展示
- AI 中文摘要、关键时间点目录和关联参考视频表达
- 初始频道监控池和订阅按钮交互
- 话题详情页、频道库页、搜索页、订阅中心、运营后台原型
- 软注册墙原型：未注册可看首页和部分详情，注册后解锁完整摘要、关键时间点、历史搜索和订阅保存
- 注册后账户页和会员方案页，用于承接留存与未来付费升级
- Pro / Team 等待名单原型，注册后可保存意向方案
- 聚合引擎技术页和后端 Pipeline 脚本雏形
- 聚合 Pipeline 展示：RSS 轮询、Data API 同步、热度排序、AI 话题聚类
- 真实频道页预览 Pipeline：YouTube RSS 失效时解析频道 `/videos` 页面，生成可预览 Top 20
- 正式品牌资产：Logo、favicon、Apple 图标、社交分享图和品牌资产页
- MVP 上线壳：`robots.txt`、`sitemap.xml`、`site.webmanifest`、`health.json`、静态部署 `_headers`

## 后续接入点

- RSS 轮询脚本：`https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
- YouTube Data API v3：`videos:list`
- 字幕拉取与大模型摘要任务：Qwen / DeepSeek
- 播放路由：官方 iframe 作为默认播放；自建 Invidious 作为可检测备用线路
- 推送：Telegram Bot / 企业微信 API / 微信服务号
- 后端任务雏形：`pipeline/score-topics.mjs`
- 部署说明：`DEPLOYMENT.md`
- 环境变量样例：`.env.example`
- 数据闭环说明：`DATA_FLOW.md`
- 数据源切换：默认加载 Pipeline 生成数据；访问 `?source=demo` 可回到固定演示数据
- 上线清单：`LAUNCH_CHECKLIST.md`

直接打开 `index.html` 即可预览。更接近真实访问方式时，也可以在本目录启动静态服务。

```bash
npm run serve
```

发布前检查：

```bash
npm run prelaunch
```

## 后端脚本试跑

```bash
node pipeline/score-topics.mjs pipeline/candidates.sample.json
node pipeline/build-digest.mjs pipeline/candidates.sample.json pipeline/daily-digest.sample.json
node pipeline/export-site-data.mjs pipeline/daily-digest.sample.json pipeline/candidates.sample.json pipeline/channels.sample.json data.generated.js
node pipeline/push-digest.mjs pipeline/daily-digest.sample.json
```

或直接运行完整本地演示链路：

```bash
node pipeline/run-local-demo.mjs
```

运行真实频道页预览链路：

```bash
RSS_RECENT_HOURS=168 node pipeline/run-real-preview.mjs
```

没有 YouTube API key 时，这条链路会使用 `web-estimated` 或 `rss-baseline-estimated` 指标，适合验证页面和运营流程；配置 `YOUTUBE_API_KEY` 后，同一条命令会自动切换到 YouTube Data API 精准指标。

然后访问：

```text
index.html
admin.html
```

检查自建 Invidious 备用线路：

```bash
INVIDIOUS_BASE_URL=https://video.techpulse.attodigitalhk.com npm run invidious:check
```

检查结果会写入 `pipeline/invidious-status.json`。状态为 `healthy` 时，首页和话题详情页会展示“备用线路播放”；否则自动降级为官方播放和摘要阅读。

需要真实 YouTube 数据时：

```bash
export YOUTUBE_API_KEY=你的Key
node pipeline/discover-rss.mjs pipeline/channels.sample.json pipeline/discovered.sample.json
node pipeline/sync-metrics.mjs pipeline/discovered.sample.json pipeline/candidates.enriched.json
```

## 注册策略原型

- 未注册用户可看首页 Top 20、榜单指标、频道基础信息、前 3 个完整话题详情。
- 未注册用户搜索结果最多展示前 5 条。
- 订阅偏好保存需要注册。
- 当前注册状态使用 `localStorage` 模拟，真实上线时替换为服务端用户系统。
