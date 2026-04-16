import { useEffect, useRef, useState } from 'react';
import { CameraView } from '../components/CameraView';
import { UploadFallback } from '../components/UploadFallback';
import { requestCamera, captureFrame, stopCamera } from '../lib/camera';
import { compressPhoto } from '../lib/compress';

interface CaptureScreenProps {
  onPhotoReady: (base64: string) => void;
}

export function CaptureScreen({ onPhotoReady }: CaptureScreenProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<'loading' | 'camera' | 'upload'>('loading');
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
  }

  function handleUploadFile(base64: string) {
    setPreview(`data:image/jpeg;base64,${base64}`);
  }

  function handleRetake() {
    setPreview(null);
  }

  async function handleAnalyze() {
    if (!preview) return;
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
            disabled={compressing}
            className="flex-1 py-3 bg-[var(--color-accent)] text-white rounded-lg font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {compressing ? 'Preparing...' : 'Analyze My Skin'}
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
