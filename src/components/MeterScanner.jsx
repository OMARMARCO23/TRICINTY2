import { useEffect, useRef, useState } from 'react';
import { ocrImage, extractBestNumberFromText } from '../lib/ocr.js';
import { Camera } from 'lucide-react';

export default function MeterScanner({ lastReading = 0, onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamErr, setStreamErr] = useState('');

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
          await videoRef.current.play();
        }
      } catch (e) {
        setStreamErr('Camera unavailable. You can upload a photo instead.');
      }
    })();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const captureAndRecognize = async (file) => {
    try {
      let imageSource;
      if (file) {
        imageSource = await fileToImage(file);
      } else {
        imageSource = await frameToImage(videoRef.current, canvasRef.current);
      }
      const { text } = await ocrImage(imageSource);
      const best = extractBestNumberFromText(text, { preferBiggerThan: lastReading });
      if (!best) {
        alert('Could not confidently read digits. Try again with better lighting and close framing.');
        return;
      }
      const confirmed = prompt('Confirm meter reading:', String(best.num));
      if (confirmed !== null && confirmed !== '') {
        const num = Number(confirmed);
        if (!Number.isNaN(num)) {
          onResult?.(num);
          onClose?.();
        }
      }
    } catch (e) {
      alert('OCR failed. Try again. ' + (e?.message || ''));
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full rounded overflow-hidden bg-black">
        {streamErr ? (
          <div className="p-4 text-center text-sm">{streamErr}</div>
        ) : (
          <video ref={videoRef} className="w-full h-auto" playsInline muted />
        )}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="border-2 border-white/70 rounded px-8 py-6"></div>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" onClick={() => captureAndRecognize()}>
          <Camera size={18} /> <span className="ml-1">Capture</span>
        </button>
        <label className="btn btn-outline flex-1">
          Upload
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && captureAndRecognize(e.target.files[0])}
          />
        </label>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function frameToImage(video, canvas) {
  return new Promise((resolve) => {
    const w = Math.min(1280, video.videoWidth || 1280);
    const h = Math.round(w * (video.videoHeight || 720) / (video.videoWidth || 1280));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL('image/jpeg', 0.9);
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
