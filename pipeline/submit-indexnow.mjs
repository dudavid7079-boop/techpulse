import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicUrl = process.env.TECHPULSE_PUBLIC_URL || "https://techpulse.attodigitalhk.com";
const endpoint = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
const enabled = process.env.INDEXNOW_ENABLED !== "false";
const sitemapPath = path.join(root, "sitemap.xml");
const keyPath = path.join(root, "indexnow-key.txt");

function readKey() {
  const envKey = process.env.INDEXNOW_KEY?.trim();
  if (envKey) return envKey;
  if (!fs.existsSync(keyPath)) return "";
  return fs.readFileSync(keyPath, "utf8").trim();
}

function readSitemapUrls() {
  if (!fs.existsSync(sitemapPath)) return [];
  const xml = fs.readFileSync(sitemapPath, "utf8");
  return [...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith(publicUrl))
    .slice(0, 10000);
}

if (!enabled) {
  console.log("IndexNow submission disabled.");
  process.exit(0);
}

const key = readKey();
const urlList = readSitemapUrls();

if (!key) {
  console.log("Missing INDEXNOW_KEY or indexnow-key.txt, skipped IndexNow submission.");
  process.exit(0);
}

if (!urlList.length) {
  console.log("No sitemap URLs found for IndexNow submission.");
  process.exit(0);
}

const payload = {
  host: new URL(publicUrl).host,
  key,
  keyLocation: `${publicUrl}/indexnow-key.txt`,
  urlList,
};

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status !== 202) {
    const body = await response.text().catch(() => "");
    console.warn(`IndexNow submission returned HTTP ${response.status}: ${body.slice(0, 300)}`);
    process.exit(0);
  }

  console.log(`IndexNow submitted ${urlList.length} URLs to ${endpoint}.`);
} catch (error) {
  console.warn(`IndexNow submission skipped: ${error.message}`);
}
