import { useState } from 'react';
import { ocrImage, initOcr } from '../lib/ocr.js';
import { FileText, Upload, Loader2 } from 'lucide-react';

export default function BillScanner({ onParsed, onClose }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setStatus('Loading OCR...');
    setProgress(0);
    try {
      // Initialize with multi-lang if you expect FR/AR terms on bills
      await initOcr({
        langs: 'eng+fra',
        whitelist: undefined,
        onProgress: (m) => {
          setStatus(m.status);
          setProgress(Math.round((m.progress || 0) * 100));
        }
      });

      setStatus('Reading photo...');
      const img = await fileToImage(file);

      setStatus('Recognizing...');
      const data = await ocrImage(img, {
        langs: 'eng+fra',
        onProgress: (m) => {
          setStatus(m.status || 'Recognizing...');
          setProgress(Math.round((m.progress || 0) * 100));
        }
      });

      const parsed = parseBillText(data.text || '');
      setResult({ text: data.text, parsed });
      onParsed?.(parsed, data.text);
      setStatus('');
      setProgress(0);
    } catch (e) {
      setStatus('Bill OCR failed. Try a sharper photo under good light.');
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

      {(loading || status) && (
        <div className="text-xs opacity-80 flex items-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          <span>{status} {progress ? `• ${progress}%` : ''}</span>
        </div>
      )}

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
    : t.match(/(?:total|amount|montant)\s*[:=]?\s*([\d.,]+)\b/i);
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

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
