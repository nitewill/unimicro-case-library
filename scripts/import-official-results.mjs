import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { officialResults } from "../src/officialResults.js";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/UmiMarketing/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const manifest = JSON.parse(await readFile(path.resolve("tmp/official-media/manifest.json"), "utf8"));
const outputRoot = path.resolve("public/assets/cases/full");
await mkdir(outputRoot, { recursive: true });

const figures = officialResults.flatMap((entry) => entry.figures);
const imported = [];
for (const figure of figures) {
  const match = figure.src.match(/\/(\d+)-(\d+)\.jpg$/);
  if (!match) throw new Error(`无法识别目标文件名：${figure.src}`);
  const pageId = Number(match[1]);
  const index = Number(match[2]);
  const source = manifest.find((entry) => entry.pageId === pageId && entry.index === index);
  if (!source?.localFile) throw new Error(`缺少官网图片缓存：${pageId}-${index}`);
  const output = path.join(outputRoot, `${pageId}-${String(index).padStart(2, "0")}.jpg`);
  await sharp(source.localFile)
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "white" })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile(output);
  imported.push(output);
}

console.log(JSON.stringify({ expected: figures.length, imported: imported.length, outputRoot }, null, 2));
