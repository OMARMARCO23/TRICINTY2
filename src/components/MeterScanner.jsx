import { useMemo, useState } from 'react';
import { Upload, Camera, Loader2, RotateCcw } from 'lucide-react';

// Digit extractor
function extractBestNumberFromText(text, { minDigits = 4, preferBiggerThan } = {}) {
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

// Build cropped+compressed JPEG dataURL for OCR
async function buildCroppedDataUrl(img, crop, targetWidth = 900, quality = 0.85) {
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;

  const sx = clamp(Math.round(natW * crop.x), 0, natW - 1);
  const sy = clamp(Math.round(natH * crop.y), 0, natH - 1);
  const sw = clamp(Math.round(natW * crop.w), 1, natW - sx);
  const sh = clamp(Math.round(natH * crop.h), 1, natH - sy);

  const scale = targetWidth / sw;
  const cw = Math.max(1, Math.round(sw * scale));
  const ch = Math.max(1, Math.round(sh * scale));

  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);

  // Optional: quick grayscale+threshold to help OCR provider
  const imgData = ctx.getImageData(0, 0, cw, ch);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const gray = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
    const bin = gray > 170 ? 255 : 0; // simple binarization
    d[i] = d[i + 1] = d[i + 2] = bin;
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  return c.toDataURL('image/jpeg', quality); // small enough for serverless
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = reject;
    img.src = url;
  });
}

export default function MeterScanner({ lastReading = 0, onResult, onClose }) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoImg, setPhotoImg] = useState(null);
  const [processedUrl, setProcessedUrl] = useState('');
  const [recognized, setRecognized] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Crop controls (percent of image)
  const [cropX, setCropX] = useState(0.1);
  const [cropY, setCropY] = useState(0.35);
  const [cropW, setCropW] = useState(0.8);
  const [cropH, setCropH] = useState(0.3);

  const cropOverlayStyle = useMemo(() => ({
    position: 'absolute',
    left: `${cropX * 100}%`,
    top: `${cropY * 100}%`,
    width: `${cropW * 100}%`,
    height: `${cropH * 100}%`,
    border: '2px solid rgba(255,255,255,0.9)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
    pointerEvents: 'none',
    borderRadius: '6px'
  }), [cropX, cropY, cropW, cropH]);

  const onPick = async (file) => {
    if (!file) return;
    try {
      setStatus('Loading photo...');
      setLoading(true);
      const { img, url } = await fileToImage(file);
      setPhotoUrl(url);
      setPhotoImg(img);
      setRecognized('');
      setProcessedUrl('');
      setStatus('Photo loaded. Adjust crop if needed, then Analyze.');
    } catch (e) {
      setStatus('Failed to read photo.');
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    if (!photoImg) {
      alert('No photo selected.');
      return;
    }
    try {
      setLoading(true);
      setStatus('Preprocessing...');
      const dataUrl = await buildCroppedDataUrl(photoImg, { x: cropX, y: cropY, w: cropW, h: cropH }, 900, 0.85);
      setProcessedUrl(dataUrl);

      setStatus('Recognizing...');
      const resp = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || 'OCR error');

      const text = String(data?.text || '');
      const best = extractBestNumberFromText(text, { preferBiggerThan: lastReading });
      if (!best) {
        setRecognized('');
        setStatus('No digits found. Try adjusting crop or taking a closer photo.');
      } else {
        setRecognized(String(best.num));
        setStatus('');
      }
    } catch (e) {
      setStatus(e?.message || 'OCR failed.');
    } finally {
      setLoading(false);
    }
  };

  const confirmUse = () => {
    const val = Number(recognized);
    if (Number.isNaN(val) || val <= lastReading) {
      alert(`Please enter a valid number greater than your last reading (${lastReading}).`);
      return;
    }
    onResult?.(val);
    onClose?.();
  };

  const retake = () => {
    setPhotoUrl('');
    setPhotoImg(null);
    setRecognized('');
    setProcessedUrl('');
    setStatus('');
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      {photoUrl ? (
        <div className="relative rounded overflow-hidden border">
          <img src={photoUrl} alt="preview" className="w-full block" />
          <div style={cropOverlayStyle} />
        </div>
      ) : (
        <div className="rounded border p-3 text-sm opacity-70">
          Take a single photo of the meter digits or upload from gallery. We will analyze the cropped region only.
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label"><span className="label-text">Crop X</span></label>
          <input type="range" min="0" max="0.6" step="0.01" value={cropX} onChange={e => setCropX(parseFloat(e.target.value))} className="range" />
        </div>
        <div>
          <label className="label"><span className="label-text">Crop Y</span></label>
          <input type="range" min="0" max="0.8" step="0.01" value={cropY} onChange={e => setCropY(parseFloat(e.target.value))} className="range" />
        </div>
        <div>
          <label className="label"><span className="label-text">Crop W</span></label>
          <input type="range" min="0.3" max="1" step="0.01" value={cropW} onChange={e => setCropW(parseFloat(e.target.value))} className="range" />
        </div>
        <div>
          <label className="label"><span className="label-text">Crop H</span></label>
          <input type="range" min="0.2" max="0.8" step="0.01" value={cropH} onChange={e => setCropH(parseFloat(e.target.value))} className="range" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <label className={`btn btn-primary flex-1 ${loading ? 'btn-disabled' : ''}`}>
          <Camera size={18} /> <span className="ml-1">Take Photo</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
        </label>

        <label className={`btn btn-outline flex-1 ${loading ? 'btn-disabled' : ''}`}>
          <Upload size={18} /> <span className="ml-1">Upload</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
        </label>

        <button className="btn btn-ghost" onClick={retake} disabled={loading}>
          <RotateCcw size={16} /> <span className="ml-1">Retake</span>
        </button>
      </div>

      {/* Analyze */}
      <button className="btn btn-accent w-full" onClick={analyze} disabled={loading || !photoImg}>
        {loading ? <Loader2 className="animate-spin" size={16} /> : null}
        <span className="ml-2">{loading ? 'Analyzing...' : 'Analyze (Fast Cloud OCR)'}</span>
      </button>

      {/* Status */}
      {status && <div className="text-xs opacity-80">{status}</div>}

      {/* Processed preview */}
      {processedUrl && (
        <div>
          <div className="text-xs opacity-70 mb-1">Processed region preview</div>
          <img src={processedUrl} alt="processed" className="w-full rounded border" />
        </div>
      )}

      {/* Recognized value */}
      <div className="form-control">
        <label className="label"><span className="label-text">Recognized reading</span></label>
        <input
          type="number"
          className="input input-bordered"
          placeholder="Not recognized yet"
          value={recognized}
          onChange={(e) => setRecognized(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <button className="btn btn-success flex-1" onClick={confirmUse} disabled={!recognized || loading}>
            Use value
          </button>
          <button className="btn flex-1" onClick={() => setRecognized('')} disabled={loading}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
