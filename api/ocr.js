export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  try {
    const { dataUrl, language } = await readBody(req);
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ message: 'Missing dataUrl' });
    }

    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';

    // Map app language -> OCR.space code
    const ocrLang = language === 'fr' ? 'fre' : language === 'ar' ? 'ara' : 'eng';

    const form = new URLSearchParams();
    form.set('apikey', apiKey);
    form.set('base64Image', `data:image/jpeg;base64,${base64}`);
    form.set('language', ocrLang);
    form.set('isOverlayRequired', 'false');
    form.set('scale', 'true');
    form.set('detectOrientation', 'true');
    form.set('OCREngine', '2');

    const resp = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const json = await resp.json();

    if (!resp.ok || json?.IsErroredOnProcessing) {
      const err =
        (Array.isArray(json?.ErrorMessage) ? json.ErrorMessage.join(', ') : json?.ErrorMessage) ||
        json?.ErrorDetails ||
        'OCR provider error';

      if (String(err).toLowerCase().includes('apikey')) {
        return res.status(401).json({ message: 'OCR API key invalid. Set OCR_SPACE_API_KEY in Vercel.' });
      }
      if (String(err).toLowerCase().includes('limit') || String(err).toLowerCase().includes('quota')) {
        return res.status(429).json({ message: 'OCR quota reached. Please try again later.' });
      }
      return res.status(502).json({ message: String(err) });
    }

    const text = (json?.ParsedResults?.[0]?.ParsedText || '').trim();
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ message: e?.message || 'OCR error' });
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}
