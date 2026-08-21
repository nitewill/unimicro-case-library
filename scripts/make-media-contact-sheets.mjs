import { createRequire } from "node:module";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/UmiMarketing/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = path.resolve("tmp/official-media");
const output = path.join(root, "contact-sheets");
await mkdir(output, { recursive: true });

for (const pageId of (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name)).map((entry) => entry.name)) {
  const pageDir = path.join(root, pageId);
  const files = (await readdir(pageDir)).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort();
  if (!files.length) continue;
  const cellWidth = 300;
  const cellHeight = 230;
  const columns = 3;
  const rows = Math.ceil(files.length / columns);
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const input = path.join(pageDir, files[index]);
    const thumbnail = await sharp(input).rotate().resize({ width: 276, height: 190, fit: "inside", background: "white" }).flatten({ background: "white" }).png().toBuffer();
    const left = (index % columns) * cellWidth + 12;
    const top = Math.floor(index / columns) * cellHeight + 30;
    composites.push({ input: thumbnail, left, top });
    composites.push({ input: Buffer.from(`<svg width="280" height="28"><rect width="280" height="28" fill="#eef4fb"/><text x="8" y="20" font-family="Arial" font-size="16" fill="#083564">${files[index]}</text></svg>`), left, top: top - 27 });
  }
  await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: "#ffffff" } })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(path.join(output, `${pageId}.jpg`));
}

console.log(`Created contact sheets in ${output}`);
