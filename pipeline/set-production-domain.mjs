import fs from "node:fs";
import path from "node:path";

const domain = process.argv[2]?.trim();

if (!domain || !/^https:\/\/[^/\s]+$/.test(domain)) {
  console.error("Usage: node pipeline/set-production-domain.mjs https://your-domain.com");
  process.exit(1);
}

const normalizedDomain = domain.replace(/\/$/, "");
const files = ["robots.txt", "sitemap.xml"];

for (const file of files) {
  const current = fs.readFileSync(file, "utf8");
  const next = current.replaceAll(/https:\/\/(?:techpulse\.example\.com|techpulse\.attodigitalhk\.com)/g, normalizedDomain);
  fs.writeFileSync(file, next);
  console.log(`Updated ${file}`);
}

const htmlFiles = fs.readdirSync(".").filter((file) => file.endsWith(".html"));

for (const file of htmlFiles) {
  const route = file === "index.html" ? "/" : `/${file}`;
  const pageUrl = `${normalizedDomain}${route}`;
  const socialImage = `${normalizedDomain}/assets/og-image.png`;
  let html = fs.readFileSync(file, "utf8");

  html = html
    .replace(/\s*<link rel="canonical"[^>]*\/?>/g, "")
    .replace(/\s*<meta property="og:url"[^>]*\/?>/g, "")
    .replace(/(<meta property="og:image" content=")[^"]*(" \/>)/, `$1${socialImage}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(" \/>)/, `$1${socialImage}$2`)
    .replace(
      /(\s*<link rel="stylesheet" href="\.\/styles\.css" \/>)/,
      `\n    <link rel="canonical" href="${pageUrl}" />\n    <meta property="og:url" content="${pageUrl}" />$1`
    );

  fs.writeFileSync(file, html);
  console.log(`Updated ${path.basename(file)} metadata`);
}
