import { readFile } from "node:fs/promises";
import path from "node:path";

const pageIds = [254, 253, 250, 247, 245, 244, 238, 239, 240, 236, 241, 242, 243, 151, 152, 153, 154, 155, 156, 157];
const requestedPageIds = process.argv.slice(2).map(Number).filter(Boolean);
const overrides = {
  238: ".firecrawl/interact-238.md",
  250: ".firecrawl/interact-250.md",
  243: ".firecrawl/newsdetail-243-retry.md",
};

function imageMatches(line) {
  return [...line.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)|`(https?:\/\/[^`]+\.(?:png|jpe?g|webp))`/gi)]
    .map((match) => ({ alt: match[1] || "", url: match[2] || match[3] }))
    .filter(({ url }) => !/static\/img\/(?:mainlogo|index\/qrcode)/i.test(url));
}

for (const pageId of requestedPageIds.length ? requestedPageIds : pageIds) {
  const source = overrides[pageId] || `.firecrawl/unimicrotech.com.cn-newsdetail-${pageId}.md`;
  let raw = await readFile(path.resolve(source), "utf8");
  if (raw.trimStart().startsWith("{")) {
    try { raw = JSON.parse(raw).markdown || raw; } catch { /* keep raw markdown */ }
  }
  const lines = raw.split(/\r?\n/);
  const records = [];
  for (let index = 0; index < lines.length; index += 1) {
    for (const image of imageMatches(lines[index])) {
      const before = lines.slice(Math.max(0, index - 4), index).filter((line) => line.trim()).slice(-2).join(" | ");
      const after = lines.slice(index + 1, index + 4).find((line) => line.trim()) || "";
      records.push({ line: index + 1, before, alt: image.alt, after, url: image.url });
    }
  }
  console.log(`\n===== ${pageId} (${records.length}) =====`);
  records.forEach((record, index) => console.log(`${index + 1}. L${record.line} | ${record.before} | ${record.alt} | ${record.after}\n   ${record.url}`));
}
