import Tesseract from 'tesseract.js';

// Use CDN-hosted worker/core for reliable loading in WebView/Capacitor
const TESS_VERSION = '5.1.0';
const WORKER_PATH = `https://unpkg.com/tesseract.js@${TESS_VERSION}/dist/worker.min.js`;
const CORE_PATH = `https://unpkg.com/tesseract.js-core@${TESS_VERSION}/tesseract-core.wasm.js`;
const LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0';

// Singleton worker + loaded languages cache
let worker = null;
let loadedLangs = '';

export async function initOcr({ langs = 'eng', whitelist = '0123456789.,', onProgress } = {}) {
  if (!worker) {
    worker = await Tesseract.createWorker({
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      logger: (m) => {
        // m = { status, progress }
        if (onProgress) onProgress(m);
      }
    });
  }
  if (loadedLangs !== langs) {
    await worker.loadLanguage(langs);
    await worker.initialize(langs);
    loadedLangs = langs;
  }
  if (whitelist) {
    await worker.setParameters({ tessedit_char_whitelist: whitelist });
  }
  return worker;
}

export async function ocrImage(image, { langs = 'eng', whitelist = '0123456789.,', onProgress } = {}) {
  const w = await initOcr({ langs, whitelist, onProgress });
  const { data } = await w.recognize(image);
  return data; // { text, confidence, lines, ... }
}

// Extract the best numeric candidate from OCR text
export function extractBestNumberFromText(text, { minDigits = 4, preferBiggerThan } = {}) {
  if (!text) return null;
  const candidates = Array.from(text.matchAll(/[\d][\d\s.,]{3,15}/g))
    .map(m => m[0].replace(/[^\d.,]/g, ''))
    .map(s => s.replace(',', '.'))
    .map(s => s.replace(/(\.\d*?)\./g, '$1'))         // only first dot
    .map(s => s.replace(/[.](?=.*[.])/g, ''))         // single decimal
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
