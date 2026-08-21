import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import JSZip from "jszip";
import { getConditionRows } from "./conditions.js";

const navy = rgb(0.02, 0.16, 0.34);
const blue = rgb(0.02, 0.35, 0.76);
const lightBlue = rgb(0.92, 0.96, 1);
const muted = rgb(0.34, 0.4, 0.49);
const line = rgb(0.85, 0.88, 0.92);
let fontBytesPromise;

function assetUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:4173";
  return new URL(path, base).href;
}

function loadFontBytes() {
  if (!fontBytesPromise) {
    fontBytesPromise = fetch(assetUrl("/fonts/SimHei.ttf")).then((response) => {
      if (!response.ok) throw new Error("中文字体加载失败");
      return response.arrayBuffer();
    });
  }
  return fontBytesPromise;
}

async function embedRasterImage(pdf, path) {
  const bytes = await fetch(assetUrl(path)).then((response) => {
    if (!response.ok) throw new Error("案例图片加载失败");
    return response.arrayBuffer();
  });
  const signature = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  return signature[0] === 0xff && signature[1] === 0xd8 ? pdf.embedJpg(bytes) : pdf.embedPng(bytes);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function htmlText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .trim();
}

function extractContentFigures(html) {
  const figures = [];
  const source = String(html || "");
  for (const match of source.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const tag = match[0];
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] || "案例原始实验图";
    if (!figures.some((entry) => entry.src === match[1])) figures.push({ src: match[1], caption: htmlText(alt) || "案例原始实验图" });
  }
  return figures;
}

function extractResultDetails(html) {
  return [...String(html || "").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => htmlText(match[1])).filter(Boolean);
}

function wrapText(text, font, size, maxWidth) {
  const lines = [];
  const normalized = String(text ?? "").replace(/\r\n?/g, "\n");
  if (!normalized) return lines;
  normalized.split("\n").forEach((paragraph) => {
    if (!paragraph) {
      lines.push("");
      return;
    }
    let current = "";
    for (const char of paragraph) {
      const next = `${current}${char}`;
      if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
  });
  return lines;
}

function drawWrapped(page, text, options) {
  const { font, size, x, y, maxWidth, color = navy, lineHeight = size * 1.55, maxLines = 12 } = options;
  const lines = wrapText(text, font, size, maxWidth).slice(0, maxLines);
  lines.forEach((entry, index) => {
    if (entry) page.drawText(entry, { x, y: y - index * lineHeight, size, font, color });
  });
  return y - lines.length * lineHeight;
}

function drawLabel(page, text, x, y, font) {
  const width = font.widthOfTextAtSize(text, 9) + 16;
  page.drawRectangle({ x, y: y - 4, width, height: 22, color: lightBlue, borderColor: rgb(0.84, 0.9, 0.98), borderWidth: 0.5 });
  page.drawText(text, { x: x + 8, y: y + 2, font, size: 9, color: blue });
  return width;
}

function drawHeader(page, font, title = "通微应用案例完整报告") {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 74, width, height: 74, color: rgb(0.98, 0.99, 1) });
  page.drawLine({ start: { x: 42, y: height - 74 }, end: { x: width - 42, y: height - 74 }, thickness: 1, color: line });
  page.drawText("UNIMICRO", { x: 42, y: height - 42, font, size: 11, color: blue });
  page.drawText(title, { x: 42, y: height - 61, font, size: 15, color: navy });
  page.drawText(`导出日期 ${today()}`, { x: width - 136, y: height - 52, font, size: 8.5, color: muted });
}

function drawFooter(page, font, pageIndex, pageCount) {
  const { width } = page.getSize();
  page.drawLine({ start: { x: 42, y: 38 }, end: { x: width - 42, y: 38 }, thickness: 0.6, color: line });
  page.drawText("上海通微分析技术有限公司 · 应用技术中心", { x: 42, y: 22, font, size: 8, color: muted });
  page.drawText(`${pageIndex} / ${pageCount}`, { x: width - 68, y: 22, font, size: 8, color: muted });
}

function drawChromatogram(page, x, y, width, height, font) {
  page.drawRectangle({ x, y, width, height, color: rgb(0.995, 0.997, 1), borderColor: line, borderWidth: 0.8 });
  page.drawLine({ start: { x: x + 36, y: y + 28 }, end: { x: x + width - 18, y: y + 28 }, thickness: 0.8, color: muted });
  page.drawLine({ start: { x: x + 36, y: y + 28 }, end: { x: x + 36, y: y + height - 18 }, thickness: 0.8, color: muted });
  const points = [
    [0, 0.03], [0.08, 0.04], [0.13, 0.08], [0.16, 0.48], [0.18, 0.09], [0.28, 0.05], [0.35, 0.12],
    [0.39, 0.92], [0.42, 0.14], [0.54, 0.06], [0.61, 0.16], [0.64, 0.62], [0.67, 0.1], [0.78, 0.05],
    [0.84, 0.22], [0.86, 0.42], [0.89, 0.08], [1, 0.04],
  ];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    page.drawLine({
      start: { x: x + 36 + x1 * (width - 56), y: y + 28 + y1 * (height - 52) },
      end: { x: x + 36 + x2 * (width - 56), y: y + 28 + y2 * (height - 52) },
      thickness: 1.4,
      color: blue,
    });
  }
  page.drawText("响应值", { x: x + 5, y: y + height - 14, font, size: 7.5, color: muted });
  page.drawText("时间 / min", { x: x + width - 66, y: y + 10, font, size: 7.5, color: muted });
}

function drawConditionTable(page, rows, font, { title = "实验条件", startY = 730, maxRows = 12 } = {}) {
  page.drawText(title, { x: 42, y: startY, font, size: 14, color: navy });
  const visibleRows = rows.slice(0, maxRows);
  visibleRows.forEach((row, index) => {
    const rowY = startY - 42 - index * 50;
    drawWrapped(page, row.label || "未命名条件", { font, size: 9, x: 42, y: rowY, maxWidth: 130, color: muted, lineHeight: 13, maxLines: 2 });
    drawWrapped(page, row.value || "—", { font, size: 10, x: 185, y: rowY, maxWidth: 365, color: navy, lineHeight: 14, maxLines: 2 });
    if (index < visibleRows.length - 1) page.drawLine({ start: { x: 42, y: rowY - 22 }, end: { x: 552, y: rowY - 22 }, thickness: 0.5, color: line });
  });
}

export async function createCasePdf(applicationCase) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await loadFontBytes(), { subset: true });
  const first = pdf.addPage([595.28, 841.89]);
  drawHeader(first, font);

  let y = 734;
  y = drawWrapped(first, applicationCase.title, { font, size: 22, x: 42, y, maxWidth: 510, color: navy, lineHeight: 31, maxLines: 2 }) - 4;
  let labelX = 42;
  [applicationCase.industry, applicationCase.detector, applicationCase.instrument].forEach((label) => {
    const used = drawLabel(first, label, labelX, y, font);
    labelX += used + 8;
  });
  y -= 46;
  let deferredStandardLines = [];
  if (applicationCase.standardReference) {
    const standardLines = wrapText(applicationCase.standardReference, font, 9.5, 510);
    const backgroundLines = Math.min(wrapText(applicationCase.background, font, 10.5, 304).length, 6);
    const fitsFirstPage = y - 30 - standardLines.length * 15 - 24 - backgroundLines * 17 >= 430;
    first.drawText("药典 / 标准依据", { x: 42, y, font, size: 12, color: blue });
    if (fitsFirstPage) {
      y = drawWrapped(first, applicationCase.standardReference, { font, size: 9.5, x: 42, y: y - 20, maxWidth: 510, color: navy, lineHeight: 15, maxLines: standardLines.length }) - 10;
    } else {
      deferredStandardLines = standardLines;
      y = drawWrapped(first, "本案例包含多条标准，详见独立的标准依据页。", { font, size: 9.5, x: 42, y: y - 20, maxWidth: 510, color: navy, lineHeight: 15, maxLines: 1 }) - 10;
    }
  }
  first.drawText("应用背景", { x: 42, y, font, size: 14, color: navy });
  y = drawWrapped(first, applicationCase.background, { font, size: 10.5, x: 42, y: y - 24, maxWidth: 304, color: muted, lineHeight: 17, maxLines: 6 });

  const image = await embedRasterImage(pdf, applicationCase.image);
  const scaled = image.scaleToFit(185, 160);
  first.drawImage(image, { x: 365, y: 478, width: scaled.width, height: scaled.height });
  first.drawText("仪器配置", { x: 365, y: 458, font, size: 9, color: muted });
  const instrumentY = drawWrapped(first, applicationCase.instrument, { font, size: 9.5, x: 365, y: 442, maxWidth: 185, color: navy, lineHeight: 14, maxLines: 2 });
  drawWrapped(first, applicationCase.detector, { font, size: 8.5, x: 365, y: instrumentY - 2, maxWidth: 185, color: blue, lineHeight: 13, maxLines: 2 });

  first.drawRectangle({ x: 42, y: 118, width: 510, height: 304, color: rgb(0.985, 0.99, 1), borderColor: line, borderWidth: 0.8 });
  first.drawText("实验条件", { x: 60, y: 390, font, size: 14, color: navy });
  const rows = getConditionRows(applicationCase);
  rows.slice(0, 5).forEach((row, index) => {
    const rowY = 348 - index * 46;
    drawWrapped(first, row.label || "未命名条件", { font, size: 9, x: 60, y: rowY, maxWidth: 112, color: muted, lineHeight: 13, maxLines: 2 });
    drawWrapped(first, row.value || "—", { font, size: 10, x: 180, y: rowY, maxWidth: 350, color: navy, lineHeight: 14, maxLines: 2 });
    if (index < Math.min(rows.length, 5) - 1) first.drawLine({ start: { x: 60, y: rowY - 18 }, end: { x: 534, y: rowY - 18 }, thickness: 0.5, color: line });
  });

  const remainingRows = rows.slice(5);
  for (let offset = 0; offset < remainingRows.length; offset += 12) {
    const continuation = pdf.addPage([595.28, 841.89]);
    drawHeader(continuation, font, "通微应用案例 · 实验条件（续）");
    drawConditionTable(continuation, remainingRows.slice(offset, offset + 12), font, { title: "实验条件（续）", startY: 730, maxRows: 12 });
  }

  for (let offset = 0; offset < deferredStandardLines.length; offset += 34) {
    const standardPage = pdf.addPage([595.28, 841.89]);
    drawHeader(standardPage, font, "通微应用案例 · 标准依据");
    standardPage.drawText("药典 / 标准依据", { x: 42, y: 730, font, size: 14, color: navy });
    const pageLines = deferredStandardLines.slice(offset, offset + 34);
    drawWrapped(standardPage, pageLines.join("\n"), { font, size: 10.5, x: 42, y: 696, maxWidth: 510, color: navy, lineHeight: 18, maxLines: pageLines.length });
  }

  const resultPage = pdf.addPage([595.28, 841.89]);
  drawHeader(resultPage, font, "通微应用案例 · 完整结果与结论");
  resultPage.drawText("结果与结论", { x: 42, y: 730, font, size: 14, color: navy });
  let resultY = drawWrapped(resultPage, applicationCase.result, { font, size: 11, x: 42, y: 702, maxWidth: 510, color: muted, lineHeight: 18, maxLines: 8 }) - 18;
  const resultDetails = extractResultDetails(applicationCase.contentHtml);
  if (resultDetails.length) {
    resultPage.drawText("官网完整结果说明", { x: 42, y: resultY, font, size: 13, color: navy });
    resultY -= 26;
    resultDetails.slice(0, 8).forEach((detail) => {
      resultY = drawWrapped(resultPage, `- ${detail}`, { font, size: 9.5, x: 48, y: resultY, maxWidth: 498, color: muted, lineHeight: 15, maxLines: 4 }) - 8;
    });
  }
  resultPage.drawRectangle({ x: 42, y: 104, width: 510, height: 144, color: lightBlue, borderColor: rgb(0.8, 0.88, 0.98), borderWidth: 0.8 });
  resultPage.drawText("需要进一步支持？", { x: 60, y: 214, font, size: 14, color: navy });
  drawWrapped(resultPage, "如需样品评估、方法开发或仪器选型建议，欢迎向通微应用团队提交需求。", { font, size: 10, x: 60, y: 188, maxWidth: 470, color: muted, lineHeight: 16, maxLines: 3 });
  drawWrapped(resultPage, applicationCase.contact, { font, size: 9.5, x: 60, y: 136, maxWidth: 470, color: blue, lineHeight: 15, maxLines: 3 });

  const resultFigures = extractContentFigures(applicationCase.contentHtml);
  if (!resultFigures.length && (applicationCase.resultImage || applicationCase.image)) resultFigures.push({ src: applicationCase.resultImage || applicationCase.image, caption: "案例原始实验图" });
  for (let offset = 0; offset < resultFigures.length; offset += 2) {
    const galleryPage = pdf.addPage([595.28, 841.89]);
    drawHeader(galleryPage, font, "通微应用案例 · 全部原始图谱与数据");
    const pageFigures = resultFigures.slice(offset, offset + 2);
    for (let index = 0; index < pageFigures.length; index += 1) {
      const entry = pageFigures[index];
      const captionY = index === 0 ? 728 : 384;
      const boxY = index === 0 ? 414 : 70;
      drawWrapped(galleryPage, `${offset + index + 1}. ${entry.caption}`, { font, size: 11, x: 42, y: captionY, maxWidth: 510, color: navy, lineHeight: 16, maxLines: 2 });
      galleryPage.drawRectangle({ x: 42, y: boxY, width: 510, height: 278, color: rgb(0.995, 0.997, 1), borderColor: line, borderWidth: 0.8 });
      const embedded = await embedRasterImage(pdf, entry.src);
      const scaled = embedded.scaleToFit(492, 260);
      galleryPage.drawImage(embedded, { x: 42 + (510 - scaled.width) / 2, y: boxY + (278 - scaled.height) / 2, width: scaled.width, height: scaled.height });
    }
  }

  const pages = pdf.getPages();
  pages.forEach((page, index) => drawFooter(page, font, index + 1, pages.length));

  const bytes = await pdf.save();
  return { bytes, filename: `${safeFilename(applicationCase.title)}_${today()}.pdf` };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadCasePdf(applicationCase) {
  const previewWindow = isWeChatBrowser() ? window.open("about:blank", "_blank") : null;
  const { bytes, filename } = await createCasePdf(applicationCase);
  const blob = new Blob([bytes], { type: "application/pdf" });
  if (isWeChatBrowser()) {
    const url = URL.createObjectURL(blob);
    if (previewWindow) previewWindow.location.href = url;
    else window.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  downloadBlob(blob, filename);
}

export async function createBatchZip(cases, onProgress) {
  const zip = new JSZip();
  const failures = [];
  for (let index = 0; index < cases.length; index += 1) {
    const applicationCase = cases[index];
    try {
      const { bytes, filename } = await createCasePdf(applicationCase);
      zip.file(filename, bytes);
    } catch (error) {
      failures.push({ title: applicationCase.title, message: error instanceof Error ? error.message : "生成失败" });
    }
    onProgress?.({ current: index + 1, total: cases.length, failures });
  }
  if (!zip.file(/\.pdf$/).length) throw new Error("没有可打包的 PDF");
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { blob, filename: `通微应用案例_${today()}.zip`, failures };
}

export function isWeChatBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent);
}
