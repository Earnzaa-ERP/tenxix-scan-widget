import { useEffect, useRef, useState } from 'react';
import { CameraView } from '../components/CameraView';
import { UploadFallback } from '../components/UploadFallback';
import { requestCamera, captureFrame, stopCamera } from '../lib/camera';
import { compressPhoto } from '../lib/compress';
import { analyzeBrightness } from '../lib/quality';

interface CaptureScreenProps {
  onPhotoReady: (base64: string) => void;
}

export function CaptureScreen({ onPhotoReady }: CaptureScreenProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<'loading' | 'camera' | 'upload'>('loading');
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [tooDark, setTooDark] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reject blank/black frames before they reach the AI (it would otherwise
  // return a confident, bogus result). Runs whenever a new photo is set.
  async function checkBrightness(base64: string) {
    try {
      const stats = await analyzeBrightness(base64);
      setTooDark(stats.tooDark);
    } catch {
      setTooDark(false); // never block on a measurement failure
    }
  }

  useEffect(() => {
    let cancelled = false;

    requestCamera()
      .then((s) => {
        if (cancelled) {
          stopCamera(s);
          return;
        }
        setStream(s);
        setMode('camera');
      })
      .catch(() => {
        if (!cancelled) setMode('upload');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (stream) stopCamera(stream);
    };
  }, [stream]);

  function handleCapture() {
    if (!videoRef.current) return;
    const base64 = captureFrame(videoRef.current);
    setPreview(`data:image/jpeg;base64,${base64}`);
    checkBrightness(base64);
  }

  function handleUploadFile(base64: string) {
    setPreview(`data:image/jpeg;base64,${base64}`);
    checkBrightness(base64);
  }

  function handleRetake() {
    setPreview(null);
    setTooDark(false);
  }

  async function handleAnalyze() {
    if (!preview || tooDark) return;
    setCompressing(true);
    try {
      const raw = preview.replace(/^data:image\/[^;]+;base64,/, '');
      const compressed = await compressPhoto(raw);
      onPhotoReady(compressed);
    } finally {
      setCompressing(false);
    }
  }

  // Preview state — photo taken, show confirm/retake
  if (preview) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 bg-black flex items-center justify-center">
          <img src={preview} alt="Your photo" className="max-h-full max-w-full object-contain" />
        </div>
        {tooDark && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94l-7.4 12.82A1.5 1.5 0 004.24 19h15.52a1.5 1.5 0 001.3-2.24L13.66 3.94a1.5 1.5 0 00-2.6 0z" />
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              It's too dark to read your skin. Move to a well-lit area facing a light, then retake.
            </p>
          </div>
        )}
        <div className="flex gap-3 p-4">
          <button
            onClick={handleRetake}
            disabled={compressing}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium text-sm disabled:opacity-40"
          >
            Retake
          </button>
          <button
            onClick={handleAnalyze}
            disabled={compressing || tooDark}
            className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100"
          >
            {compressing ? 'Preparing...' : tooDark ? 'Too Dark — Retake' : 'Analyze My Skin'}
          </button>
        </div>
      </div>
    );
  }

  // Loading camera
  if (mode === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Accessing camera...</p>
      </div>
    );
  }

  // Camera mode
  if (mode === 'camera' && stream) {
    return (
      <div className="flex-1 flex flex-col">
        <CameraView stream={stream} onCapture={handleCapture} videoRef={videoRef} />
        <button
          onClick={() => {
            if (stream) stopCamera(stream);
            setStream(null);
            setMode('upload');
          }}
          className="py-2 text-center text-gray-500 text-xs underline"
        >
          Upload a photo instead
        </button>
      </div>
    );
  }

  // Upload fallback
  return <UploadFallback onFile={handleUploadFile} />;
}
