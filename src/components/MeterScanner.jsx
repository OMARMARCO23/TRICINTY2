import { useEffect, useRef, useState, useMemo } from 'react';
import { initOcr, ocrImage, extractBestNumberFromText, preprocessCropToCanvas } from '../lib/ocr.js';
import { Camera, Upload, Loader2, RotateCcw } from 'lucide-react';

export default function MeterScanner({ lastReading = 0, onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [phase, setPhase] = useState('camera'); // 'camera' | 'preview' | 'analyzing'
  const [stream, setStream] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [streamErr, setStreamErr] = useState('');

  const [photoUrl, setPhotoUrl] = useState('');
  const [photoImg, setPhotoImg] = useState(null);

  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [recognized, setRecognized] = useState('');

  // Crop controls
  const [cropX, setCropX] = useState(0.1);
  const [cropY, setCropY] = useState(0.35);
  const [cropW, setCropW] = useState(0.8);
  const [cropH, setCropH] = useState(0.3);
  const [threshold, setThreshold] = useState(180);
  const [targetWidth, setTargetWidth] = useState(900);

  // Start camera when entering camera phase
  useEffect(() => {
    if (phase !== 'camera') return;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
            videoRef.current.play().catch(() => {});
          };
          videoRef.current.onplaying = () => setVideoReady(true);
        }
      } catch (e) {
        setStreamErr('Camera unavailable. You can upload a photo instead.');
      }
    })();
    // Cleanup handled explicitly on capture
  }, [phase]);

  // Preload OCR once (so analyze starts fast)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setStatus('Loading OCR...');
        setProgress(0);
        await initOcr({
          langs: 'eng',
          whitelist: '0123456789.,',
          psm: '7',
          onProgress: (m) => {
            if (!mounted) return;
            setStatus(m.status);
            if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100));
          }
        });
        setStatus('');
        setProgress(0);
      } catch (e) {
        setStatus('Failed to initialize OCR. Check your connection on first run.');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const stopStream = () => {
    try { stream?.getTracks()?.forEach(t => t.stop()); } catch {}
    setStream(null);
    setVideoReady(false);
  };

  const captureOnce = async () => {
    if (!videoReady || !videoRef.current) {
      alert('Camera not ready. Please try again.');
      return;
    }
    try {
      setStatus('Capturing...');
      const img = await frameToImage(videoRef.current, canvasRef.current);
      stopStream();
      const url = imageToDataUrl(img);
      setPhotoUrl(url);
      setPhotoImg(img);
      setPhase('preview');
      setStatus('');
      setProgress(0);
      setRecognized('');
    } catch (e) {
      setStatus('Capture failed. Try again.');
    }
  };

  const onUpload = async (file) => {
    if (!file) return;
    try {
      setStatus('Loading photo...');
      const img = await fileToImage(file);
      stopStream();
      const url = imageToDataUrl(img);
      setPhotoUrl(url);
      setPhotoImg(img);
      setPhase('preview');
      setStatus('');
      setProgress(0);
      setRecognized('');
    } catch (e) {
      setStatus('Failed to read photo.');
    }
  };

  const analyze = async () => {
    if (!photoImg) {
      alert('No photo to analyze.');
      return;
    }
    try {
      setPhase('analyzing');
      setRecognized('');
      const crop = { x: cropX, y: cropY, w: cropW, h: cropH };

      // Try 3 thresholds to be robust
      const tries = uniqClamp([threshold, threshold - 30, threshold + 30], 100, 220);
      let bestCandidate = null;
      for (let i = 0; i < tries.length; i++) {
        setStatus(`Preprocessing... (try ${i + 1}/${tries.length})`);
        const preCanvas = preprocessCropToCanvas(photoImg, crop, targetWidth, tries[i]);

        setStatus(`Recognizing... (try ${i + 1}/${tries.length})`);
        const data = await ocrImage(preCanvas, {
          langs: 'eng',
          whitelist: '0123456789.,',
          psm: '7',
          onProgress: (m) => {
            setStatus((m.status || 'Recognizing...') + ` (try ${i + 1}/${tries.length})`);
            if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100));
          },
          timeoutMs: 12000
        });

        const cand = extractBestNumberFromText(data.text, { preferBiggerThan: lastReading });
        if (cand) { bestCandidate = cand; break; }
      }

      if (!bestCandidate) {
        setStatus('No digits found. Adjust crop/threshold and try again.');
      } else {
        setStatus('');
        setRecognized(String(bestCandidate.num));
      }
    } catch (e) {
      setStatus(e?.message === 'OCR timeout' ? 'Analysis timed out. Try tighter crop or smaller scale.' : 'Analysis failed. Try again.');
    } finally {
      setPhase('preview');
      setProgress(0);
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
    setPhase('camera');
    setStatus('');
    setProgress(0);
  };

  // Style for crop overlay in preview (percentage-based box)
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

  return (
    <div className="space-y-3">
      {/* Phase: Camera */}
      {phase === 'camera' && (
        <>
          <div className="relative w-full rounded overflow-hidden bg-black">
            {streamErr ? (
              <div className="p-4 text-center text-sm">{streamErr}</div>
            ) : (
              <video ref={videoRef} className="w-full h-auto" playsInline muted />
            )}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-white/70 rounded px-10 py-6"></div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={captureOnce}>
              <Camera size={18} /> <span className="ml-1">Capture</span>
            </button>
            <label className="btn btn-outline flex-1">
              <Upload size={18} /> <span className="ml-1">Upload</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              />
            </label>
          </div>
        </>
      )}

      {/* Phase: Preview / Analyze */}
      {phase !== 'camera' && (
        <>
          {photoUrl && (
            <div className="relative rounded overflow-hidden border">
              <img src={photoUrl} alt="preview" className="w-full block" />
              {/* Live crop overlay on the preview */}
              <div style={cropOverlayStyle} />
            </div>
          )}

          {/* Crop and preprocess controls */}
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
            <div>
              <label className="label"><span className="label-text">Threshold</span></label>
              <input type="range" min="100" max="220" step="1" value={threshold} onChange={e => setThreshold(parseInt(e.target.value))} className="range" />
              <div className="text-xs opacity-70 mt-1">{threshold}</div>
            </div>
            <div>
              <label className="label"><span className="label-text">Scale width</span></label>
              <input type="range" min="600" max="1400" step="50" value={targetWidth} onChange={e => setTargetWidth(parseInt(e.target.value))} className="range" />
              <div className="text-xs opacity-70 mt-1">{targetWidth}px</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={analyze} disabled={phase === 'analyzing'}>
              {phase === 'analyzing' ? <Loader2 className="animate-spin" size={16} /> : null}
              <span className="ml-1">{phase === 'analyzing' ? 'Analyzing...' : 'Analyze'}</span>
            </button>
            <button className="btn btn-ghost flex-1" onClick={retake}>
              <RotateCcw size={16} /> <span className="ml-1">Retake</span>
            </button>
          </div>

          {(status || phase === 'analyzing') && (
            <div className="text-xs opacity-80">
              {status} {progress ? `• ${progress}%` : ''}
            </div>
          )}

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
              <button className="btn btn-success flex-1" onClick={confirmUse} disabled={!recognized}>
                Use value
              </button>
              <button className="btn flex-1" onClick={() => setRecognized('')}>
                Clear
              </button>
            </div>
            <p className="text-[11px] opacity-70 mt-1">
              Tip: Move the crop box so it tightly frames the digits. Increase Scale width if digits look small.
            </p>
          </div>
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function frameToImage(video, canvas) {
  return new Promise((resolve) => {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const w = Math.min(1280, vw);
    const h = Math.round((w * vh) / vw);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL('image/jpeg', 0.9);
  });
}

function imageToDataUrl(img) {
  const c = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.9);
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

function uniqClamp(arr, min, max) {
  const s = new Set(arr.map(n => Math.max(min, Math.min(max, n))));
  return Array.from(s);
}
