import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const pageIds = [254, 253, 250, 247, 245, 244, 238, 239, 240, 236, 241, 242, 243, 151, 152, 153, 154, 155, 156, 157];
const overrides = {
  238: ".firecrawl/interact-238.md",
  250: ".firecrawl/interact-250.md",
  243: ".firecrawl/newsdetail-243-retry.md",
  247: ".firecrawl/newsdetail-247-refresh.md",
};
const fallbackUrls = {
  "247-2": "https://img1.17img.cn/17img/images/202607/uepic/19003fc6-4c42-4878-9345-b95fcfd88b97.jpg",
  "247-3": "https://img1.17img.cn/17img/images/202607/uepic/a202eb16-169a-4ac4-a371-2251400b43f8.jpg",
  "247-4": "https://img1.17img.cn/17img/images/202607/uepic/58e7e05d-1569-4b45-ae16-75b92c33d0e6.jpg",
};
const outputRoot = path.resolve("tmp/official-media");

function extractUrls(markdown) {
  const matches = [...markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)|`(https?:\/\/[^`]+\.(?:png|jpe?g|webp))`/gi)];
  return [...new Set(matches.map((match) => match[1] || match[2]).filter((url) => !/static\/img\/(?:mainlogo|index\/qrcode)/i.test(url)))];
}

function extensionFor(url, contentType) {
  const urlExtension = new URL(url).pathname.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase();
  if (urlExtension) return urlExtension === "jpeg" ? "jpg" : urlExtension;
  if (/webp/i.test(contentType)) return "webp";
  if (/png/i.test(contentType)) return "png";
  return "jpg";
}

const manifest = [];
for (const pageId of pageIds) {
  const source = overrides[pageId] || `.firecrawl/unimicrotech.com.cn-newsdetail-${pageId}.md`;
  let raw = await readFile(path.resolve(source), "utf8");
  if (raw.trimStart().startsWith("{")) {
    try { raw = JSON.parse(raw).markdown || raw; } catch { /* keep markdown */ }
  }
  extractUrls(raw).forEach((url, index) => manifest.push({ pageId, index: index + 1, url }));
}

await mkdir(outputRoot, { recursive: true });
const batches = [];
for (let offset = 0; offset < manifest.length; offset += 6) batches.push(manifest.slice(offset, offset + 6));
for (const batch of batches) {
  await Promise.all(batch.map(async (entry) => {
    try {
      let response = await fetch(entry.url, { headers: { "User-Agent": "Mozilla/5.0", Referer: `https://www.unimicrotech.com.cn/newsdetail/${entry.pageId}/` } });
      if (!response.ok && fallbackUrls[`${entry.pageId}-${entry.index}`]) {
        entry.fallbackUrl = fallbackUrls[`${entry.pageId}-${entry.index}`];
        response = await fetch(entry.fallbackUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const extension = extensionFor(entry.url, response.headers.get("content-type") || "");
      const pageDir = path.join(outputRoot, String(entry.pageId));
      await mkdir(pageDir, { recursive: true });
      entry.localFile = path.join(pageDir, `${String(entry.index).padStart(2, "0")}.${extension}`);
      entry.bytes = bytes.length;
      await writeFile(entry.localFile, bytes);
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
    }
  }));
}

await writeFile(path.join(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ total: manifest.length, downloaded: manifest.filter((entry) => entry.localFile).length, failures: manifest.filter((entry) => entry.error) }, null, 2));
