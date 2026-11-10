import { exportReportImage } from './exportImage.js';

export const EXPORT_WIDTH = 900;
export const EXPORT_SCALE = 2;
export const EXPORT_PAGE_HEIGHT = 2400;

export function paginateRows(heights, availableHeight) {
  if (!Number.isFinite(availableHeight) || availableHeight <= 0) throw new Error('导出页面可用高度不足');
  const pages = [];
  let page = [];
  let used = 0;
  heights.forEach((height, index) => {
    if (!Number.isFinite(height) || height <= 0) throw new Error('新闻尺寸无效，请刷新后重试');
    if (height > availableHeight) throw new Error('单条新闻过长，无法完整放入图片');
    if (page.length && used + height > availableHeight) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(index);
    used += height;
  });
  if (page.length) pages.push(page);
  return pages;
}

export function safeFilename(value) {
  return String(value).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 80).replace(/[. ]+$/g, '') || 'module';
}

export async function exportModulePages(source, group, theme, onProgress) {
  await document.fonts.ready;
  const list = source.querySelector('.export-news-list');
  const rows = Array.from(list.children);
  const header = source.querySelector('.export-header');
  const footer = source.querySelector('.export-footer');
  const padding = 64;
  // Extra space absorbs subpixel rounding and the page label's line box.
  const available = EXPORT_PAGE_HEIGHT - padding - header.offsetHeight - footer.offsetHeight - 16;
  const pages = paginateRows(rows.map(row => Math.ceil(row.getBoundingClientRect().height)), available);
  const files = [];
  for (let index = 0; index < pages.length; index++) {
    onProgress(`${group.name} · 第 ${index + 1} / ${pages.length} 张`);
    const page = source.cloneNode(false);
    const pageHeader = header.cloneNode(true);
    pageHeader.querySelector('.export-page-number').textContent = `${index + 1} / ${pages.length}`;
    const pageList = list.cloneNode(false);
    pages[index].forEach(rowIndex => pageList.appendChild(rows[rowIndex].cloneNode(true)));
    page.append(pageHeader, pageList, footer.cloneNode(true));
    source.parentElement.appendChild(page);
    try {
      const blob = await exportReportImage(page, theme, { preferredScale: EXPORT_SCALE, windowWidth: 1200 });
      files.push({
        filename: `${String(group.index).split('/')[0]}_${safeFilename(group.name)}_${String(index + 1).padStart(2, '0')}.png`,
        blob,
      });
    } finally {
      page.remove();
    }
  }
  return files;
}

export async function packageImages(files, timestamp) {
  if (!files.length) throw new Error('所选模块没有可导出的新闻');
  if (files.length === 1) return { ...files[0], imageCount: 1 };
  const { zipSync } = await import('fflate');
  const entries = {};
  for (const file of files) entries[file.filename] = new Uint8Array(await file.blob.arrayBuffer());
  return {
    filename: `TrendRadar_${safeFilename(timestamp)}.zip`,
    blob: new Blob([zipSync(entries, { level: 0 })], { type: 'application/zip' }),
    imageCount: files.length,
  };
}
