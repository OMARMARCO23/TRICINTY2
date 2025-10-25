import { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext.jsx';
import { FileText, Upload, Loader2 } from 'lucide-react';

// Inline API base to avoid Rollup resolving wrong config file
const IS_NATIVE =
  typeof window !== 'undefined' &&
  window.location &&
  window.location.protocol === 'capacitor:';
const API_BASE = IS_NATIVE ? 'https://YOUR-VERCEL-APP.vercel.app' : '';

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = reject;
    img.src = url;
  });
}

export default function BillScanner({ onParsed, onClose }) {
  const { settings } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [result, setResult] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setStatus('Loading photo...');
    try {
      const { img, url } = await fileToImage(file);
      setPreview(url);

      const c = document.createElement('canvas');
      const maxW = 1200;
      const ratio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
      c.width = Math.min(maxW, img.naturalWidth || img.width);
      c.height = Math.round(c.width / ratio);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const du = c.toDataURL('image/jpeg', 0.85);
      setDataUrl(du);
      setStatus('Ready. Press Analyze.');
    } catch (e) {
      setStatus('Failed to read photo.');
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    if (!dataUrl) {
      setStatus('Select a photo first.');
      return;
    }
    setLoading(true);
    setStatus('Recognizing...');
    try {
      const resp = await fetch(`${API_BASE}/api/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, language: settings.language })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.message || 'OCR error');
      const text = String(json?.text || '');
      const parsed = parseBillText(text);
      setResult({ text, parsed });
      onParsed?.(parsed, text);
      setStatus('');
    } catch (e) {
      setStatus(e?.message || 'Bill OCR failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText />
        <div className="font-medium">Scan your bill</div>
      </div>

      <label className={`btn btn-primary ${loading ? 'btn-disabled' : ''}`}>
        <Upload size={18} /> <span className="ml-1">Choose photo</span>
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>

      {preview && (
        <div className="rounded overflow-hidden border">
          <img src={preview} alt="bill" className="w-full" />
        </div>
      )}

      <button className="btn btn-accent w-full" onClick={analyze} disabled={loading || !dataUrl}>
        {loading ? <Loader2 className="animate-spin" size={16} /> : null}
        <span className="ml-2">{loading ? 'Analyzing...' : 'Analyze'}</span>
      </button>

      {status && <div className="text-xs opacity-80">{status}</div>}

      {result?.parsed && (
        <div className="text-sm space-y-1">
          <div><b>Provider:</b> {result.parsed.provider || '—'}</div>
          <div><b>Period:</b> {result.parsed.periodStart || '—'} → {result.parsed.periodEnd || '—'}</div>
          <div><b>Total kWh:</b> {result.parsed.totalKwh ?? '—'}</div>
          <div><b>Total amount:</b> {result.parsed.totalAmount ?? '—'} {result.parsed.currency || ''}</div>
          <div className="opacity-60">You can copy these into Settings/History.</div>
        </div>
      )}
    </div>
  );
}

function parseBillText(text) {
  const t = (text || '').replace(/\s+/g, ' ');
  const curMatch = t.match(/\b(MAD|DH|DHS|EUR|€|USD|\$)\b/i);
  const currency = curMatch ? curMatch[1].toUpperCase() : '';

  const amountMatch = currency
    ? t.match(new RegExp(`(?:${currency}\\s*([\\d.,]+))|(?:([\\d.,]+)\\s*${currency})`, 'i'))
    : t.match(/(?:total|amount|montant|montant total)\s*[:=]?\s*([\d.,]+)\b/i);
  let totalAmount = null;
  if (amountMatch) totalAmount = parseFloat((amountMatch[1] || amountMatch[2] || '').replace(',', '.'));

  const kwhMatch = t.match(/([\d.,]+)\s*kwh\b/i) || t.match(/\bkwh\b\s*[:=]?\s*([\d.,]+)/i);
  let totalKwh = null;
  if (kwhMatch) totalKwh = parseFloat((kwhMatch[1] || '').replace(',', '.'));

  const dates = Array.from(t.matchAll(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/gi)).map(m => m[1]);
  const periodStart = dates[0] || '';
  const periodEnd = dates[1] || '';

  const providerMatch = t.match(/\b(ONEE|Lydec|Redal|Veolia|EDF|ENGIE|PG&E|SUEZ)\b/i);
  const provider = providerMatch ? providerMatch[1] : '';

  return { provider, periodStart, periodEnd, totalKwh, totalAmount, currency };
}
