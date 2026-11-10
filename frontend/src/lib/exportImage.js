// The original html2canvas 1.4 parser rejects modern computed colors such as color(srgb ...).
import html2canvas, { createDefaultValidator } from 'html2canvas-pro';

// Keep long reports below common canvas dimension and memory limits.
const MAX_CANVAS_SIDE = 32760;
const MAX_CANVAS_PIXELS = 16 * 1024 * 1024;

export function getCaptureScale(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('页面尺寸无效，请刷新后重试');
  }
  return Math.min(
    1.5,
    MAX_CANVAS_SIDE / width,
    MAX_CANVAS_SIDE / height,
    Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
  );
}

export function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob && blob.size > 0) resolve(blob);
      else reject(new Error('图片生成失败，请缩小浏览器窗口后重试'));
    }, 'image/png');
  });
}

export function createCaptureValidator(scale) {
  const validator = createDefaultValidator();
  const validateDimensions = validator.validateDimensions.bind(validator);
  // The library checks CSS dimensions by default. Canvas limits apply to the
  // scaled pixel buffer; a long report can safely fit after getCaptureScale().
  validator.validateDimensions = (width, height) => validateDimensions(width * scale, height * scale);
  return validator;
}

export async function exportReportImage(element, theme) {
  await document.fonts.ready;
  const width = element.scrollWidth;
  const height = element.scrollHeight;
  const scale = getCaptureScale(width, height);
  const canvas = await html2canvas(element, {
    backgroundColor: theme === 'light' ? '#f2f2f2' : '#101012',
    scale,
    validator: createCaptureValidator(scale),
    width,
    height,
    useCORS: true,
    logging: false,
    // Preserve the current responsive layout in the cloned page.
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    scrollX: 0,
    scrollY: 0,
    onclone: clonedDoc => {
      const style = clonedDoc.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
        [data-export-controls] { visibility: hidden !important; }
      `;
      clonedDoc.head.appendChild(style);
      clonedDoc.querySelectorAll('.bg-grid-pattern').forEach(el => el.remove());
      clonedDoc.querySelectorAll('.backdrop-blur-sm').forEach(el => {
        el.classList.remove('backdrop-blur-sm');
        el.style.backgroundColor = theme === 'light'
          ? 'rgba(255,255,255,0.98)' : 'rgba(16,16,18,0.98)';
      });
    },
  });
  try {
    return await canvasToPng(canvas);
  } finally {
    // Release the potentially large pixel buffer after encoding.
    canvas.width = 0;
    canvas.height = 0;
  }
}
