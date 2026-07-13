import fs from "node:fs";

const channelsPath = process.argv[2] || "pipeline/channels.sample.json";
const outPath = process.argv[3] || "pipeline/discovered.sample.json";
const recentHours = Number(process.env.RSS_RECENT_HOURS || 24);
const maxWebVideosPerChannel = Number(process.env.WEB_FALLBACK_LIMIT || 12);

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function pick(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].replaceAll("&amp;", "&").trim() : "";
}

function decodeJsonText(value = "") {
  return value
    .replaceAll('\\"', '"')
    .replaceAll("\\u0026", "&")
    .replaceAll("\\/", "/")
    .replaceAll("\\n", " ")
    .replaceAll("\\t", " ")
    .trim();
}

function getChannelWebUrl(channel) {
  if (channel.webUrl) return channel.webUrl;
  if (channel.handle) return `https://www.youtube.com/${channel.handle}/videos`;
  return "";
}

function parseRelativeAgeHours(text = "") {
  const normalized = text.toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s+(minute|hour|day|week|month|year)s?\s+ago/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    minute: 1 / 60,
    hour: 1,
    day: 24,
    week: 24 * 7,
    month: 24 * 30,
    year: 24 * 365,
  };

  return amount * multipliers[unit];
}

function parseFeed(xml, channel) {
  return xml
    .split("<entry>")
    .slice(1)
    .map((entry) => ({
      videoId: pick(entry, /<yt:videoId>(.*?)<\/yt:videoId>/s),
      channelId: channel.channelId,
      channel: channel.name,
      category: channel.category,
      channelWeight: channel.weight || 1,
      title: pick(entry, /<title>(.*?)<\/title>/s),
      publishedAt: pick(entry, /<published>(.*?)<\/published>/s),
      url: pick(entry, /<link rel="alternate" href="(.*?)"\/>/s),
      discoveredAt: new Date().toISOString(),
      source: "rss",
    }))
    .filter((item) => item.videoId)
    .filter((item) => {
      if (!item.publishedAt) return true;
      const ageHours = (Date.now() - new Date(item.publishedAt).getTime()) / 36e5;
      return ageHours <= recentHours;
    });
}

function parseChannelPage(html, channel) {
  const now = new Date().toISOString();
  const ids = [];
  const seen = new Set();
  const idPattern = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let match;

  while ((match = idPattern.exec(html)) && ids.length < maxWebVideosPerChannel) {
    if (!seen.has(match[1])) {
      ids.push(match[1]);
      seen.add(match[1]);
    }
  }

  return ids.map((videoId) => {
    const index = html.indexOf(`"videoId":"${videoId}"`);
    const slice = index >= 0 ? html.slice(index, index + 6000) : "";
    const titleMatch =
      slice.match(/"lockupMetadataViewModel":\{"title":\{"content":"(.*?)"\}/s) ||
      slice.match(/"title":\{"runs":\[\{"text":"(.*?)"\}\]/s) ||
      slice.match(/"title":\{"simpleText":"(.*?)"\}/s);
    const publishedMatch =
      slice.match(/"publishedTimeText":\{"simpleText":"(.*?)"\}/s) ||
      slice.match(/"accessibilityLabel":"([^"]* ago)"/s) ||
      slice.match(/"text":\{"content":"([^"]* ago)"\}/s);
    const viewMatch =
      slice.match(/"viewCountText":\{"simpleText":"(.*?)"\}/s) ||
      slice.match(/"text":\{"content":"([^"]* views?)"\}/s);
    const publishedText = publishedMatch ? decodeJsonText(publishedMatch[1]) : "";

    return {
      videoId,
      channelId: channel.channelId,
      channel: channel.name,
      category: channel.category,
      channelWeight: channel.weight || 1,
      title: titleMatch ? decodeJsonText(titleMatch[1]) : `YouTube video ${videoId}`,
      publishedAt: "",
      publishedText,
      viewText: viewMatch ? decodeJsonText(viewMatch[1]) : "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      discoveredAt: now,
      source: "web",
    };
  }).filter((item) => {
    const ageHours = parseRelativeAgeHours(item.publishedText);
    return ageHours === null || ageHours <= recentHours;
  });
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 TechPulse/0.1",
    },
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function main() {
  const channels = readJson(channelsPath, []);
  const discovered = [];

  for (const channel of channels) {
    if (channel.status === "paused") {
      console.warn(`Skipped paused channel ${channel.name}`);
      continue;
    }

    let items = [];

    if (channel.rssUrl) {
      const rss = await fetchText(channel.rssUrl);
      if (rss.ok) {
        items = parseFeed(rss.text, channel);
      } else {
        console.warn(`RSS failed ${channel.name}: ${rss.status}`);
      }
    }

    if (!items.length) {
      const webUrl = getChannelWebUrl(channel);
      if (!webUrl) {
        console.warn(`No web fallback for ${channel.name}`);
        continue;
      }
      const page = await fetchText(webUrl);
      if (!page.ok) {
        console.warn(`Web fallback failed ${channel.name}: ${page.status}`);
        continue;
      }
      items = parseChannelPage(page.text, channel);
    }

    discovered.push(...items);
  }

  fs.writeFileSync(outPath, `${JSON.stringify(discovered, null, 2)}\n`);
  console.log(`Discovered ${discovered.length} videos from ${channels.length} channels within ${recentHours}h -> ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
