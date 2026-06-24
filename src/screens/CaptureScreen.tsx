import { useEffect, useRef, useState } from 'react';
import { CameraView } from '../components/CameraView';
import { UploadFallback } from '../components/UploadFallback';
import { requestCamera, captureStill, stopCamera } from '../lib/camera';
import { compressPhoto } from '../lib/compress';
import { analyzeBrightness, assessFaceRegion, cropFace } from '../lib/quality';
import { detectFace, prewarmFaceDetector } from '../lib/faceDetect';

interface CaptureScreenProps {
  onPhotoReady: (base64: string) => void;
}

// ?qa shows the measured quality numbers on the preview, to calibrate thresholds.
const showQa = new URLSearchParams(window.location.search).has('qa');

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Crop a full still to the detected face; fall back to the full frame.
async function cropToFace(fullBase64: string): Promise<string> {
  const face = await detectFace(fullBase64);
  return face.box ? cropFace(fullBase64, face.box) : fullBase64;
}

export function CaptureScreen({ onPhotoReady }: CaptureScreenProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<'loading' | 'camera' | 'upload'>('loading');
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [tooDark, setTooDark] = useState(false);
  const [noFace, setNoFace] = useState(false);
  const [poorQuality, setPoorQuality] = useState(false);
  const [validating, setValidating] = useState(false);
  const [qaText, setQaText] = useState('');
  const [flashing, setFlashing] = useState(false);
  const capturingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Gate junk frames before they reach the AI (it would otherwise return a
  // confident, bogus result). In order: blank/black frame -> no face ->
  // poor face-region quality (underexposed / hazy / soft). All fail open.
  async function checkPhoto(base64: string) {
    setValidating(true);
    setTooDark(false);
    setNoFace(false);
    setPoorQuality(false);
    try {
      const [stats, face] = await Promise.all([analyzeBrightness(base64), detectFace(base64)]);
      if (stats.tooDark) {
        setTooDark(true);
        return;
      }
      if (!face.hasFace) {
        setNoFace(true);
        return;
      }
      if (face.box) {
        const q = await assessFaceRegion(base64, face.box);
        setPoorQuality(q.poor);
        if (showQa) {
          setQaText(
            `expo ${q.exposure.toFixed(0)} · DR ${q.dynamicRange.toFixed(0)} · unif ${(q.uniformity * 100).toFixed(0)}% · noise ${q.noise.toFixed(1)} · sharp ${q.sharpness.toFixed(0)}`,
          );
        }
      }
    } catch {
      // fail open — leave all gates clear
    } finally {
      setValidating(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    prewarmFaceDetector(); // start loading the model while the user frames the shot

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

  // Crop to the face, show it, and run the quality gates.
  async function prepareAndPreview(fullBase64: string) {
    const cropped = await cropToFace(fullBase64);
    setPreview(`data:image/jpeg;base64,${cropped}`);
    checkPhoto(cropped);
  }

  // Capture sequence: screen-flash to light the face (front cameras have no
  // flash — ATA/AAD teledermatology lighting), let auto-exposure adapt, take a
  // full-resolution still, then crop to the face.
  async function runCapture() {
    if (capturingRef.current || !videoRef.current || !stream) return;
    capturingRef.current = true;
    try {
      setFlashing(true);
      await delay(380); // give the front camera time to re-expose to the bright screen
      const full = await captureStill(videoRef.current, stream);
      setFlashing(false);
      await prepareAndPreview(full);
    } catch {
      setFlashing(false);
    } finally {
      capturingRef.current = false;
    }
  }

  function handleUploadFile(base64: string) {
    void prepareAndPreview(base64);
  }

  function handleRetake() {
    setPreview(null);
    setTooDark(false);
    setNoFace(false);
    setPoorQuality(false);
    setQaText('');
  }

  async function handleAnalyze() {
    if (!preview || tooDark || noFace || poorQuality || validating) return;
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
        {(tooDark || noFace || poorQuality) && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94l-7.4 12.82A1.5 1.5 0 004.24 19h15.52a1.5 1.5 0 001.3-2.24L13.66 3.94a1.5 1.5 0 00-2.6 0z" />
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              {tooDark
                ? "It's too dark to read your skin. Move to a well-lit area facing a light, then retake."
                : noFace
                  ? 'We couldn’t find a face in this photo. Center your face in the frame and retake.'
                  : 'Your face is too dimly lit or blurry for an accurate read. Face a light, hold steady, and retake.'}
            </p>
          </div>
        )}
        {showQa && qaText && (
          <p className="mx-4 mt-2 text-[10px] font-mono text-gray-400">{qaText}</p>
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
            disabled={compressing || validating || tooDark || noFace || poorQuality}
            className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100"
          >
            {compressing
              ? 'Preparing...'
              : validating
                ? 'Checking photo…'
                : tooDark
                  ? 'Too Dark — Retake'
                  : noFace
                    ? 'No Face — Retake'
                    : poorQuality
                      ? 'Poor Quality — Retake'
                      : 'Analyze My Skin'}
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
        {/* Screen-flash: full-white overlay lights the face for the capture. */}
        {flashing && <div className="fixed inset-0 z-[60] bg-white" aria-hidden="true" />}
        <CameraView stream={stream} onCapture={runCapture} videoRef={videoRef} />
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
