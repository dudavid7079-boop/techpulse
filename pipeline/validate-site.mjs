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
  "styles.css",
  "robots.txt",
  "sitemap.xml",
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
  return clean.replace(/^\.\//, "");
}

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing required file: ${file}`);
}

for (const jsonFile of ["site.webmanifest", "health.json", "pipeline/job-status.json", "pipeline/refresh-status.json", "pipeline/product-signals.real.json", "pipeline/channel-tests.json", "pipeline/invidious-status.json"]) {
  if (!exists(jsonFile)) continue;
  try {
    JSON.parse(read(jsonFile));
  } catch (error) {
    errors.push(`Invalid JSON: ${jsonFile} (${error.message})`);
  }
}

const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html")).sort();

for (const file of htmlFiles) {
  const html = read(file);
  for (const snippet of requiredHeadSnippets) {
    if (!html.includes(snippet)) errors.push(`${file} missing head snippet: ${snippet}`);
  }

  if (!/href=["']\.\/styles\.css(?:\?[^"']+)?["']/.test(html)) {
    errors.push(`${file} missing stylesheet link: ./styles.css`);
  }

  const matches = html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g);
  for (const match of matches) {
    const relative = normalizeAssetPath(match[1]);
    if (!relative) continue;
    if (!exists(relative)) errors.push(`${file} references missing asset/page: ${match[1]}`);
  }

  if (!/property="og:image" content="https:\/\/[^"]+\/assets\/og-image\.png"/.test(html)) {
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
if (robots.includes("techpulse.example.com") || sitemap.includes("techpulse.example.com")) {
  warnings.push("Production domain placeholder still present in robots.txt or sitemap.xml.");
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
