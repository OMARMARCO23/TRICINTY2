import { useEffect, useRef, useState } from 'react';
import { ocrImage, extractBestNumberFromText, initOcr } from '../lib/ocr.js';
import { Camera, Upload, Loader2 } from 'lucide-react';

export default function MeterScanner({ lastReading = 0, onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [videoReady, setVideoReady] = useState(false);
  const [streamErr, setStreamErr] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [recognized, setRecognized] = useState(''); // editable recognized value

  // Prepare camera
  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
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
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Preload OCR worker to avoid first-time latency after capture
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setStatus('Loading OCR...');
        setProgress(0);
        await initOcr({
          langs: 'eng',
          whitelist: '0123456789.,',
          onProgress: (m) => {
            if (!mounted) return;
            setStatus(m.status);
            if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100));
          }
        });
        setStatus('');
        setProgress(0);
      } catch (e) {
        setStatus('Failed to initialize OCR.');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const capture = async () => {
    if (!videoReady || !videoRef.current) {
      alert('Camera not ready. Please wait a second and try again.');
      return;
    }
    try {
      setProcessing(true);
      setStatus('Capturing frame...');
      setProgress(0);

      const img = await frameToImage(videoRef.current, canvasRef.current);
      setStatus('Recognizing...');
      const data = await ocrImage(img, {
        langs: 'eng',
        whitelist: '0123456789.,',
        onProgress: (m) => {
          setStatus(m.status || 'Recognizing...');
          if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100));
        }
      });

      const best = extractBestNumberFromText(data.text, { preferBiggerThan: lastReading });
      if (!best) {
        setStatus('No digits found. Try closer framing and better lighting.');
        setProgress(0);
        setRecognized('');
      } else {
        setStatus('');
        setProgress(0);
        setRecognized(String(best.num));
      }
    } catch (e) {
      setStatus('OCR failed. Try again.');
    } finally {
      setProcessing(false);
    }
  };

  const onUpload = async (file) => {
    if (!file) return;
    try {
      setProcessing(true);
      setStatus('Reading photo...');
      setProgress(0);
      const img = await fileToImage(file);

      setStatus('Recognizing...');
      const data = await ocrImage(img, {
        langs: 'eng',
        whitelist: '0123456789.,',
        onProgress: (m) => {
          setStatus(m.status || 'Recognizing...');
          if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100));
        }
      });

      const best = extractBestNumberFromText(data.text, { preferBiggerThan: lastReading });
      if (!best) {
        setStatus('No digits found. Try a sharper/closer photo.');
        setProgress(0);
        setRecognized('');
      } else {
        setStatus('');
        setProgress(0);
        setRecognized(String(best.num));
      }
    } catch (e) {
      setStatus('Photo OCR failed. Try again.');
    } finally {
      setProcessing(false);
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

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="relative w-full rounded overflow-hidden bg-black">
        {streamErr ? (
          <div className="p-4 text-center text-sm">{streamErr}</div>
        ) : (
          <video ref={videoRef} className="w-full h-auto" playsInline muted />
        )}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* framing guide */}
          <div className="border-2 border-white/70 rounded px-10 py-6"></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" onClick={capture} disabled={processing}>
          {processing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={18} />}
          <span className="ml-1">{processing ? 'Working...' : 'Capture'}</span>
        </button>
        <label className={`btn btn-outline flex-1 ${processing ? 'btn-disabled' : ''}`}>
          <Upload size={18} /> <span className="ml-1">Upload</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            disabled={processing}
          />
        </label>
      </div>

      {/* Progress */}
      {(status || processing) && (
        <div className="text-xs opacity-80">
          {status} {progress ? `• ${progress}%` : ''}
        </div>
      )}

      {/* Recognized value confirm */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Recognized reading</span>
        </label>
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
            Retry
          </button>
        </div>
        <p className="text-[11px] opacity-70 mt-1">
          Tip: Fill the frame with the digits only. Avoid glare and blur.
        </p>
      </div>

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
    img.src = canvas.toDataURL('image/jpeg', 0.92);
  });
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
