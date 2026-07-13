# TechPulse · 科技脉动 部署建议

## MVP 静态站部署

当前版本是静态多页面网站，可以直接部署到：

- Cloudflare Pages
- Vercel Static
- Netlify
- Nginx / Caddy 静态目录
- 香港 VPS 的 `/var/www/techpulse`

当前正式域名：`https://techpulse.attodigitalhk.com`。

```bash
npm run domain:set -- https://你的正式域名
```

## 发布前本地检查

```bash
npm run prelaunch
RSS_RECENT_HOURS=168 npm run pipeline:preview
```

默认页面会加载 `data.generated.js`。如需回到固定演示数据，可以访问 `index.html?source=demo`。

## 推荐香港 VPS 结构

```text
/opt/globalpilot
  /app                  # 个人网站 / 博客 Next.js
  /content              # 博客内容
  /youtube-ai-tech-aggregator
    index.html          # TechPulse 静态页面
    pipeline            # TechPulse 数据任务
    data.generated.js
  compose.yml
  compose.techpulse.yml
  deploy/Caddyfile
```

## FRP + Nginx Proxy Manager 部署

```bash
TECHPULSE_BIND=127.0.0.1 TECHPULSE_PORT=8103 docker compose -f compose.techpulse.yml --env-file .env.production up -d
```

然后在 Nginx Proxy Manager 中把 `techpulse.attodigitalhk.com` 反向代理到 VM 的 `8103` 端口。完整配置见根目录的 `deploy/NPM_PROXY_HOSTS.md`。

自建 Invidious 建议使用独立子域名：

```caddyfile
video.techpulse.attodigitalhk.com {
  reverse_proxy 127.0.0.1:3000
  encode zstd gzip
}
```

视频备用线路上线前，先运行：

```bash
INVIDIOUS_BASE_URL=https://video.techpulse.attodigitalhk.com npm run invidious:check
```

只有 `pipeline/invidious-status.json` 返回 `healthy` 时，前端才展示备用播放入口。

## Cron 示例

```cron
0 */2 * * * cd /opt/globalpilot/youtube-ai-tech-aggregator && node pipeline/discover-rss.mjs pipeline/channels.sample.json pipeline/discovered.real.json
15 */6 * * * cd /opt/globalpilot/youtube-ai-tech-aggregator && node pipeline/sync-metrics.mjs pipeline/discovered.real.json pipeline/candidates.real.json
0 8 * * * cd /opt/globalpilot/youtube-ai-tech-aggregator && node pipeline/build-digest.mjs pipeline/candidates.real.json pipeline/daily-digest.real.json
5 8 * * * cd /opt/globalpilot/youtube-ai-tech-aggregator && node pipeline/export-site-data.mjs pipeline/daily-digest.real.json pipeline/candidates.real.json pipeline/channels.sample.json data.generated.js
30 8 * * * cd /opt/globalpilot/youtube-ai-tech-aggregator && node pipeline/push-digest.mjs pipeline/daily-digest.real.json
```

生产环境页面默认引用 `data.generated.js`，每日 08:05 由 Pipeline 刷新。开发阶段可以通过 `?source=demo` 继续使用 `data.js` 固定演示数据。

## 静态部署文件

- `_headers`：Cloudflare Pages / Netlify 可识别的安全头和缓存策略
- `robots.txt`：搜索引擎抓取规则
- `sitemap.xml`：核心页面站点地图
- `site.webmanifest`：PWA / 移动端收藏信息
- `health.json`：静态健康检查入口

## 下一步生产化

1. 先用 JSON 文件跑通全链路。
2. 稳定后换 SQLite。
3. 用户订阅增长后换 PostgreSQL。
4. AI 摘要和聚类任务放到队列中，避免阻塞页面。
5. Invidious 备用线路独立监控成功率；未通过健康检查时页面自动降级到官方 iframe 和摘要阅读。
