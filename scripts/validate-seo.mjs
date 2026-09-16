import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distDirectory = fileURLToPath(new URL("../dist", import.meta.url));
const learnDirectory = path.join(distDirectory, "learn");
const guideDirectories = (await readdir(learnDirectory)).sort();

if (guideDirectories.length !== 5) {
  throw new Error(`Expected 5 SEO guides, found ${guideDirectories.length}`);
}

const titles = new Set();
const canonicals = new Set();

for (const guideDirectory of guideDirectories) {
  const htmlPath = path.join(learnDirectory, guideDirectory, "index.html");
  const html = await readFile(htmlPath, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  const heading = html.match(/<h1>([^<]+)<\/h1>/)?.[1];
  const structuredDataText = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];

  if (!title || !canonical || !heading || !structuredDataText) {
    throw new Error(`Missing SEO metadata in ${htmlPath}`);
  }
  if (!html.includes('<html lang="ar" dir="rtl">')) {
    throw new Error(`Arabic RTL declaration is missing in ${htmlPath}`);
  }
  if (!html.includes('name="description"') || !html.includes('property="og:title"')) {
    throw new Error(`Description or Open Graph metadata is missing in ${htmlPath}`);
  }
  if (!Array.isArray(JSON.parse(structuredDataText))) {
    throw new Error(`Structured data must be an array in ${htmlPath}`);
  }
  if (titles.has(title) || canonicals.has(canonical)) {
    throw new Error(`Duplicate title or canonical in ${htmlPath}`);
  }

  titles.add(title);
  canonicals.add(canonical);
}

for (const asset of ["seo-pages.css", "seo-pages.js", "sitemap.xml", "robots.txt"]) {
  const assetStat = await stat(path.join(distDirectory, asset));
  if (!assetStat.isFile() || assetStat.size === 0) {
    throw new Error(`Missing generated asset: ${asset}`);
  }
}

const sitemap = await readFile(path.join(distDirectory, "sitemap.xml"), "utf8");
const sitemapUrls = sitemap.match(/<loc>[^<]+<\/loc>/g) ?? [];
if (sitemapUrls.length !== 6) {
  throw new Error(`Expected 6 sitemap URLs, found ${sitemapUrls.length}`);
}

for (const canonical of canonicals) {
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
    throw new Error(`Canonical missing from sitemap: ${canonical}`);
  }
}

const robots = await readFile(path.join(distDirectory, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://nasq-code.web.app/sitemap.xml")) {
  throw new Error("robots.txt does not advertise the production sitemap");
}

console.log(`SEO validation passed: ${guideDirectories.length} guides, ${sitemapUrls.length} sitemap URLs`);
