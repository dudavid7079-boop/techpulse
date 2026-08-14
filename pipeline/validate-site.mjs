import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "index.html",
  "404.html",
  "data.generated.js",
  "data.js",
  "product-data.js",
  "product-data.generated.js",
  "product-loader.js",
  "i18n.js",
  "styles.css",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "indexnow-key.txt",
  "feed.xml",
  "ai-products.json",
  "site.webmanifest",
  "health.json",
  "_headers",
  "playback-config.js",
  "assets/logo-mark.png",
  "assets/logo-lockup.png",
  "assets/favicon.ico",
  "assets/favicon.png",
  "assets/apple-touch-icon.png",
  "assets/og-image.png",
  "pipeline/job-status.json",
  "pipeline/send-alert.mjs",
  "pipeline/product-signals.real.json",
  "pipeline/channel-tests.json",
  "pipeline/invidious-status.json"
];

const requiredHeadSnippets = [
  'rel="icon"',
  'rel="apple-touch-icon"',
  'rel="manifest"',
  'name="theme-color"',
  'property="og:image"',
  'name="twitter:image"',
  'rel="canonical"',
  'property="og:url"'
];

const errors = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function normalizeAssetPath(rawValue) {
  if (!rawValue) return null;
  if (/^(https?:|mailto:|tel:|#|javascript:)/.test(rawValue)) return null;
  const clean = rawValue.split("#")[0].split("?")[0];
  if (!clean || clean === "." || clean === "./") return null;
  return clean;
}

function resolveReference(fromFile, rawValue) {
  const normalized = normalizeAssetPath(rawValue);
  if (!normalized) return null;
  const base = path.dirname(fromFile);
  return path.normalize(path.join(base === "." ? "" : base, normalized)).replace(/\\/g, "/").replace(/^\.\//, "");
}

function listHtmlFiles() {
  const topLevel = fs.readdirSync(root).filter((file) => file.endsWith(".html"));
  const productPages = exists("products")
    ? fs.readdirSync(path.join(root, "products")).filter((file) => file.endsWith(".html")).map((file) => `products/${file}`)
    : [];
  const topicPages = exists("topics")
    ? fs.readdirSync(path.join(root, "topics")).filter((file) => file.endsWith(".html")).map((file) => `topics/${file}`)
    : [];
  const englishPages = exists("en")
    ? fs.readdirSync(path.join(root, "en"), { withFileTypes: true }).flatMap((entry) => {
        if (entry.isFile() && entry.name.endsWith(".html")) return [`en/${entry.name}`];
        if (!entry.isDirectory()) return [];
        return fs.readdirSync(path.join(root, "en", entry.name))
          .filter((file) => file.endsWith(".html"))
          .map((file) => `en/${entry.name}/${file}`);
      })
    : [];
  return [...topLevel, ...productPages, ...topicPages, ...englishPages].sort();
}

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing required file: ${file}`);
}

for (const jsonFile of ["site.webmanifest", "health.json", "ai-products.json", "pipeline/job-status.json", "pipeline/refresh-status.json", "pipeline/product-signals.real.json", "pipeline/channel-tests.json", "pipeline/invidious-status.json"]) {
  if (!exists(jsonFile)) continue;
  try {
    JSON.parse(read(jsonFile));
  } catch (error) {
    errors.push(`Invalid JSON: ${jsonFile} (${error.message})`);
  }
}

const htmlFiles = listHtmlFiles();

for (const file of htmlFiles) {
  const html = read(file);
  for (const snippet of requiredHeadSnippets) {
    if (!html.includes(snippet)) errors.push(`${file} missing head snippet: ${snippet}`);
  }

  if (!/href=["'](?:\.\.\/\.\.\/|\.\.\/|\.\/)styles\.css(?:\?[^"']+)?["']/.test(html)) {
    errors.push(`${file} missing stylesheet link: ./styles.css, ../styles.css, or ../../styles.css`);
  }

  const matches = html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g);
  for (const match of matches) {
    const resolved = resolveReference(file, match[1]);
    if (!resolved) continue;
    if (!exists(resolved)) errors.push(`${file} references missing asset/page: ${match[1]}`);
  }

  if (!/property="og:image" content="https:\/\/[^"']+\/assets\/og-image\.png"/.test(html)) {
    errors.push(`${file} should use an absolute production og:image URL.`);
  }
}

const dataLoader = exists("data-loader.js") ? read("data-loader.js") : "";
if (!dataLoader.includes('|| "generated"')) {
  errors.push("data-loader.js should default to generated data for production MVP.");
}

const playbackConfig = exists("playback-config.js") ? read("playback-config.js") : "";
if (!playbackConfig.includes("video.techpulse.attodigitalhk.com")) {
  errors.push("playback-config.js should point to the planned TechPulse Invidious subdomain.");
}

const robots = exists("robots.txt") ? read("robots.txt") : "";
const sitemap = exists("sitemap.xml") ? read("sitemap.xml") : "";
const llms = exists("llms.txt") ? read("llms.txt") : "";
const feed = exists("feed.xml") ? read("feed.xml") : "";
if (robots.includes("techpulse.example.com") || sitemap.includes("techpulse.example.com")) {
  warnings.push("Production domain placeholder still present in robots.txt or sitemap.xml.");
}
if (!llms.includes("TechPulse") || !llms.includes("Product intelligence pages")) {
  errors.push("llms.txt should describe TechPulse and product intelligence pages.");
}
if (!llms.includes("ai-products.json") || !llms.includes("feed.xml")) {
  errors.push("llms.txt should expose RSS feed and machine-readable product index.");
}
if (!feed.includes("<rss") || !feed.includes("<item>")) {
  errors.push("feed.xml should be a populated RSS feed.");
}
if (!sitemap.includes("/products/") || !sitemap.includes("/topics/")) {
  errors.push("sitemap.xml should include generated product and topic pages.");
}
if (!sitemap.includes("xmlns:xhtml") || !sitemap.includes("/en/products/")) {
  errors.push("sitemap.xml should include hreflang alternates and English product pages.");
}
if (!robots.includes("indexnow-key.txt")) {
  errors.push("robots.txt should expose the IndexNow key location.");
}

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error("Validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validation passed: ${htmlFiles.length} HTML pages, ${requiredFiles.length} required files.`);
