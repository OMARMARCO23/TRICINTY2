import Tesseract from 'tesseract.js';

// Reliable CDN paths for Capacitor WebView
const TESS_VERSION = '5.1.0';
const WORKER_PATH = `https://unpkg.com/tesseract.js@${TESS_VERSION}/dist/worker.min.js`;
const CORE_PATH = `https://unpkg.com/tesseract.js-core@${TESS_VERSION}/tesseract-core.wasm.js`;
const LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0';

let worker = null;
let loadedLangs = '';

export async function initOcr({ langs = 'eng', whitelist = '0123456789.,', onProgress } = {}) {
  if (!worker) {
    worker = await Tesseract.createWorker({
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      logger: (m) => onProgress && onProgress(m)
    });
  }
  if (loadedLangs !== langs) {
    await worker.loadLanguage(langs);
    await worker.initialize(langs);
    loadedLangs = langs;
  }
  if (whitelist) {
    await worker.setParameters({
      tessedit_char_whitelist: whitelist,
      // numeric bias
      classify_bln_numeric_mode: '1'
    });
  }
  return worker;
}

export async function ocrImage(imageOrCanvas, { langs = 'eng', whitelist = '0123456789.,', onProgress } = {}) {
  const w = await initOcr({ langs, whitelist, onProgress });
  const { data } = await w.recognize(imageOrCanvas);
  return data;
}

// Build a preprocessed canvas cropped to digits for faster, more accurate OCR
export function preprocessCropToCanvas(img, cropPct = { x: 0.1, y: 0.35, w: 0.8, h: 0.3 }, targetWidth = 1000, threshold = 180) {
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;

  const sx = Math.max(0, Math.min(natW, Math.round(natW * cropPct.x)));
  const sy = Math.max(0, Math.min(natH, Math.round(natH * cropPct.y)));
  const sw = Math.max(1, Math.round(natW * cropPct.w));
  const sh = Math.max(1, Math.round(natH * cropPct.h));

  const scale = targetWidth / sw;
  const cw = Math.round(sw * scale);
  const ch = Math.round(sh * scale);

  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');

  // Draw crop
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);

  // Grayscale + simple threshold
  const imgData = ctx.getImageData(0, 0, cw, ch);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const gray = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
    const bin = gray > threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = bin;
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return c;
}

export function extractBestNumberFromText(text, { minDigits = 4, preferBiggerThan } = {}) {
  if (!text) return null;
  const candidates = Array.from(text.matchAll(/[\d][\d\s.,]{3,15}/g))
    .map(m => m[0].replace(/[^\d.,]/g, ''))
    .map(s => s.replace(',', '.'))
    .map(s => s.replace(/(\.\d*?)\./g, '$1'))
    .map(s => s.replace(/[.](?=.*[.])/g, ''))
    .map(s => s.trim())
    .filter(s => (s.replace('.', '').length >= minDigits))
    .map(s => ({ raw: s, num: parseFloat(s) }))
    .filter(x => !Number.isNaN(x.num));

  if (!candidates.length) return null;

  if (typeof preferBiggerThan === 'number') {
    const bigger = candidates.filter(c => c.num >= preferBiggerThan);
    if (bigger.length) return bigger.sort((a, b) => b.num - a.num)[0];
  }
  return candidates.sort((a, b) => b.num - a.num)[0];
}
