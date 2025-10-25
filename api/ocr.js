export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  try {
    const { dataUrl } = await readBody(req);
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ message: 'Missing dataUrl' });
    }

    // Extract Base64 payload (strip data:image/jpeg;base64,)
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'; // For quick testing

    const form = new URLSearchParams();
    form.set('apikey', apiKey);
    form.set('base64Image', `data:image/jpeg;base64,${base64}`);
    form.set('language', 'eng');
    form.set('isOverlayRequired', 'false');
    form.set('scale', 'true');
    form.set('detectOrientation', 'true');
    form.set('OCREngine', '2'); // better engine

    const resp = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const json = await resp.json();

    if (!resp.ok || json?.IsErroredOnProcessing) {
      const errMsg = json?.ErrorMessage || json?.ErrorDetails || 'OCR provider error';
      return res.status(502).json({ message: String(errMsg) });
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
