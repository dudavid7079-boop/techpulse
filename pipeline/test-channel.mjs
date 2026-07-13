import fs from "node:fs";

const channelsPath = process.argv[2] || "pipeline/channels.sample.json";
const outPath = process.argv[3] || "pipeline/channel-tests.json";
const query = (process.env.CHANNEL_QUERY || process.argv[4] || "").toLowerCase();
const recentHours = Number(process.env.RSS_RECENT_HOURS || 168);

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function pick(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].replaceAll("&amp;", "&").trim() : "";
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

function parseFeed(xml) {
  return xml
    .split("<entry>")
    .slice(1)
    .map((entry) => ({
      videoId: pick(entry, /<yt:videoId>(.*?)<\/yt:videoId>/s),
      title: pick(entry, /<title>(.*?)<\/title>/s),
      publishedAt: pick(entry, /<published>(.*?)<\/published>/s),
    }))
    .filter((item) => item.videoId)
    .filter((item) => {
      if (!item.publishedAt) return true;
      const ageHours = (Date.now() - new Date(item.publishedAt).getTime()) / 36e5;
      return ageHours <= recentHours;
    });
}

function parseChannelPage(html) {
  const ids = [];
  const seen = new Set();
  const idPattern = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let match;

  while ((match = idPattern.exec(html)) && ids.length < 12) {
    if (!seen.has(match[1])) {
      ids.push(match[1]);
      seen.add(match[1]);
    }
  }

  return ids
    .map((videoId) => {
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
      const publishedText = publishedMatch ? publishedMatch[1].replaceAll("\\u0026", "&") : "";

      return {
        videoId,
        title: titleMatch ? titleMatch[1].replaceAll("\\u0026", "&") : `YouTube video ${videoId}`,
        publishedText,
      };
    })
    .filter((item) => {
      const ageHours = parseRelativeAgeHours(item.publishedText);
      return ageHours === null || ageHours <= recentHours;
    });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 TechPulse/0.1",
    },
  });
  return { ok: response.ok, status: response.status, text: await response.text() };
}

function matchesQuery(channel) {
  if (!query) return true;
  return [channel.name, channel.channelId, channel.handle, channel.category].join(" ").toLowerCase().includes(query);
}

async function testChannel(channel) {
  const startedAt = new Date().toISOString();
  const result = {
    channelId: channel.channelId,
    name: channel.name,
    status: channel.status || "active",
    testedAt: startedAt,
    source: "",
    ok: false,
    videoCount: 0,
    rssStatus: null,
    webStatus: null,
    sampleVideos: [],
    error: "",
  };

  if (channel.status === "paused") {
    return { ...result, error: "Channel is paused." };
  }

  try {
    if (channel.rssUrl) {
      const rss = await fetchText(channel.rssUrl);
      result.rssStatus = rss.status;
      if (rss.ok) {
        const videos = parseFeed(rss.text);
        if (videos.length) {
          return {
            ...result,
            ok: true,
            source: "rss",
            videoCount: videos.length,
            sampleVideos: videos.slice(0, 5),
          };
        }
      }
    }

    const webUrl = getChannelWebUrl(channel);
    if (!webUrl) return { ...result, error: "Missing webUrl/handle fallback." };

    const web = await fetchText(webUrl);
    result.webStatus = web.status;
    if (!web.ok) return { ...result, error: `Web fallback failed with HTTP ${web.status}.` };

    const videos = parseChannelPage(web.text);
    return {
      ...result,
      ok: videos.length > 0,
      source: "web",
      videoCount: videos.length,
      sampleVideos: videos.slice(0, 5),
      error: videos.length ? "" : "No recent videos parsed from channel page.",
    };
  } catch (error) {
    return { ...result, error: error.message };
  }
}

async function main() {
  const channels = readJson(channelsPath, []).filter(matchesQuery);
  const results = [];

  for (const channel of channels) {
    const result = await testChannel(channel);
    results.push(result);
    console.log(`${result.ok ? "OK" : "FAIL"} ${result.name}: ${result.videoCount} videos via ${result.source || "none"}`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    recentHours,
    count: results.length,
    okCount: results.filter((item) => item.ok).length,
    results,
  };

  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
