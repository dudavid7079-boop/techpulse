# TechPulse MVP Launch Checklist

## 必须完成

- [x] 独立静态站目录，不改动 GlobalPilot 首页
- [x] 正式 Logo、favicon、Apple Touch Icon、社交分享图
- [x] 首页 Top 20 热榜、筛选、播放器和 AI 中文摘要原型
- [x] 话题详情、搜索、频道池、订阅中心、账户、定价、后台页面
- [x] 默认使用 `data.generated.js` 展示 Pipeline 生成数据
- [x] RSS / 网页发现、指标估算、排序、导出前端数据脚本
- [x] 频道健康测试结果展示
- [x] 软注册墙和订阅保存的 localStorage 原型
- [x] `robots.txt`、`sitemap.xml`、`site.webmanifest`、`health.json`
- [x] 静态部署 headers：基础安全头和缓存策略
- [x] 发布前自动验收脚本：`npm run prelaunch`
- [x] 播放线路配置与 Invidious 健康状态降级机制

## 上线前替换

- [x] 运行 `npm run domain:set -- https://techpulse.attodigitalhk.com` 替换 `robots.txt` 和 `sitemap.xml`
- [x] 正式域名替换后重新运行 `npm run prelaunch`
- [ ] 配置 `YOUTUBE_API_KEY`，从估算指标切换到 YouTube Data API 精准指标
- [ ] 确认香港 VPS / Cloudflare Pages / Vercel 的最终部署路径
- [ ] 配置 Telegram Bot 或企业微信推送密钥
- [ ] 自建 `video.techpulse.attodigitalhk.com` Invidious 实例并运行 `npm run invidious:check`

## 每日运营

- [ ] 08:00 运行真实预览链路：`RSS_RECENT_HOURS=168 node pipeline/run-real-preview.mjs`
- [ ] 检查 `pipeline/job-status.json` 是否 `status: success`
- [ ] 检查 `pipeline/channel-tests.json` 中失败频道
- [ ] 审核 Top 20 是否有重复话题或低相关视频
- [ ] 发布并推送每日中文快报
