import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { officialCases } from "../src/data.js";
import { createBatchZip, createCasePdf } from "../src/pdf.js";

const outputDir = path.resolve("tmp/pdfs/verification");
await mkdir(outputDir, { recursive: true });

const single = await createCasePdf(officialCases[0]);
const singlePath = path.join(outputDir, single.filename);
await writeFile(singlePath, single.bytes);
const singlePdf = await PDFDocument.load(single.bytes);

const batch = await createBatchZip(officialCases);
const zipBytes = new Uint8Array(await batch.blob.arrayBuffer());
const zipPath = path.join(outputDir, batch.filename);
await writeFile(zipPath, zipBytes);
const zip = await JSZip.loadAsync(zipBytes);
const files = Object.keys(zip.files).filter((name) => name.endsWith(".pdf"));
const idPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const summary = {
  single: { path: singlePath, filename: single.filename, pages: singlePdf.getPageCount(), bytes: single.bytes.length },
  batch: { path: zipPath, filename: batch.filename, pdfCount: files.length, bytes: zipBytes.length, failures: batch.failures },
  filenamesContainInternalIds: [single.filename, batch.filename, ...files].some((name) => idPattern.test(name)),
};

if (summary.single.pages < 3) throw new Error("单篇 PDF 未包含完整结果图页");
if (summary.batch.pdfCount !== officialCases.length) throw new Error("ZIP 中 PDF 数量不符合预期");
if (summary.batch.failures.length) throw new Error("批量导出存在失败项");
if (summary.filenamesContainInternalIds) throw new Error("导出文件名包含内部 UUID");

console.log(JSON.stringify(summary, null, 2));
