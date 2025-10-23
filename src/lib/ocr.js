import Tesseract from 'tesseract.js';

let workerPromise = null;

export async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker({
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: () => {} // silence logs
      });
      // Load languages. Start with English; add 'fra' or 'ara' if needed for bills.
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      // For meter digits, restrict to numbers and separators
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789.,'
      });
      return worker;
    })();
  }
  return workerPromise;
}

export async function ocrImage(image) {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(image);
  return data; // { text, confidence, ... }
}

export function extractBestNumberFromText(text, { minDigits = 4, preferBiggerThan } = {}) {
  if (!text) return null;
  // Capture digit sequences (with possible separators)
  const matches = Array.from(text.matchAll(/[\d][\d\s.,]{3,15}/g))
    .map(m => m[0].replace(/[^\d.,]/g, ''))
    .map(s => s.replace(',', '.'))
    .map(s => s.replace(/(\.\d*?)\./g, '$1')) // keep only first dot
    .map(s => s.replace(/[.](?=.*[.])/g, '')) // single decimal
    .map(s => s.trim())
    .filter(s => (s.replace('.', '').length >= minDigits))
    .map(s => ({ raw: s, num: parseFloat(s) }))
    .filter(x => !Number.isNaN(x.num));

  if (!matches.length) return null;

  if (typeof preferBiggerThan === 'number') {
    const bigger = matches.filter(m => m.num >= preferBiggerThan);
    if (bigger.length) {
      return bigger.sort((a, b) => b.num - a.num)[0];
    }
  }
  return matches.sort((a, b) => b.num - a.num)[0];
}
