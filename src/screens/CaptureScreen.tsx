import { useEffect, useRef, useState } from 'react';
import { CameraView } from '../components/CameraView';
import { requestCamera, captureStill, stopCamera } from '../lib/camera';
import { compressPhoto } from '../lib/compress';
import { analyzeBrightness, assessFaceRegion, cropFace } from '../lib/quality';
import { detectFace, prewarmFaceDetector } from '../lib/faceDetect';

interface CaptureScreenProps {
  onPhotoReady: (
    base64: string,
    sideImages?: { left?: string; right?: string },
    trainingConsent?: boolean,
  ) => void;
}

// ?qa shows the measured quality numbers on the preview, to calibrate thresholds.
const showQa = new URLSearchParams(window.location.search).has('qa');

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Crop a full still to the detected face; fall back to the full frame.
async function cropToFace(fullBase64: string): Promise<string> {
  const face = await detectFace(fullBase64);
  return face.box ? cropFace(fullBase64, face.box) : fullBase64;
}

type Mode = 'choose' | 'loading' | 'camera';

export function CaptureScreen({ onPhotoReady }: CaptureScreenProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>('choose');
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [tooDark, setTooDark] = useState(false);
  const [noFace, setNoFace] = useState(false);
  const [poorQuality, setPoorQuality] = useState(false);
  const [validating, setValidating] = useState(false);
  const [qaText, setQaText] = useState('');
  const [flashing, setFlashing] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [sides, setSides] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
  // Opt-in AI-training consent. Unticked by default (NDPR/GDPR-friendly):
  // without a tick the photo stays transient exactly as before.
  const [trainingConsent, setTrainingConsent] = useState(false);
  const capturingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);
  const sideSlotRef = useRef<'left' | 'right'>('left');

  // Warm the face model up front (used by both upload-crop and the live scanner).
  useEffect(() => {
    prewarmFaceDetector();
  }, []);

  useEffect(() => {
    return () => {
      if (stream) stopCamera(stream);
    };
  }, [stream]);

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

  // Crop to the face, show it, and run the quality gates.
  async function prepareAndPreview(fullBase64: string) {
    const cropped = await cropToFace(fullBase64);
    setPreview(`data:image/jpeg;base64,${cropped}`);
    checkPhoto(cropped);
  }

  // --- Upload path (recommended): the phone's native camera / gallery ---
  function openNativeUpload() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).replace(/^data:image\/[^;]+;base64,/, '');
      void prepareAndPreview(base64);
    };
    reader.readAsDataURL(file);
  }

  // --- Live scanner path (secondary) ---
  function startLiveScanner() {
    setLiveError(null);
    setMode('loading');
    requestCamera()
      .then((s) => {
        setStream(s);
        setMode('camera');
      })
      .catch(() => {
        setMode('choose');
        setLiveError('Camera access was blocked. Upload a photo instead.');
      });
  }

  // Capture sequence: screen-flash to light the face (front cameras have no
  // flash — ATA/AAD teledermatology lighting), let auto-exposure adapt, take a
  // full-resolution still, then crop to the face.
  async function runCapture() {
    if (capturingRef.current || !videoRef.current || !stream) return;
    capturingRef.current = true;
    try {
      setFlashing(true);
      await delay(380);
      const full = await captureStill(videoRef.current, stream);
      setFlashing(false);
      await prepareAndPreview(full);
    } catch {
      setFlashing(false);
    } finally {
      capturingRef.current = false;
    }
  }

  // --- Optional side angles (3-way scan) ---
  function addSide(slot: 'left' | 'right') {
    sideSlotRef.current = slot;
    sideInputRef.current?.click();
  }

  function handleSideFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const slot = sideSlotRef.current;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).replace(/^data:image\/[^;]+;base64,/, '');
      const cropped = await cropToFace(base64); // face-crop the side too; falls back to full
      setSides((s) => ({ ...s, [slot]: cropped }));
    };
    reader.readAsDataURL(file);
  }

  function handleRetake() {
    setPreview(null);
    setTooDark(false);
    setNoFace(false);
    setPoorQuality(false);
    setQaText('');
    setSides({ left: null, right: null });
  }

  async function handleAnalyze() {
    if (!preview || tooDark || noFace || poorQuality || validating) return;
    setCompressing(true);
    try {
      const raw = preview.replace(/^data:image\/[^;]+;base64,/, '');
      const compressed = await compressPhoto(raw);
      const sideImages: { left?: string; right?: string } = {};
      if (sides.left) sideImages.left = await compressPhoto(sides.left);
      if (sides.right) sideImages.right = await compressPhoto(sides.right);
      onPhotoReady(compressed, sides.left || sides.right ? sideImages : undefined, trainingConsent);
    } finally {
      setCompressing(false);
    }
  }

  function renderInner() {
    // Preview — photo taken, confirm/retake
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
          {showQa && qaText && <p className="mx-4 mt-2 text-[10px] font-mono text-gray-400">{qaText}</p>}

          {/* Optional side angles (3-way scan) — only offered once the front shot passes */}
          {!tooDark && !noFace && !poorQuality && !validating && (
            <div className="px-4 pt-3">
              <p className="text-xs text-gray-500 mb-2">
                Add side angles for a more complete read <span className="text-gray-400">· optional</span>
              </p>
              <div className="flex gap-3">
                {(['left', 'right'] as const).map((slot) => (
                  <div key={slot} className="flex-1">
                    {sides[slot] ? (
                      <div className="relative">
                        <img
                          src={`data:image/jpeg;base64,${sides[slot]}`}
                          alt={`${slot} side`}
                          className="w-full h-20 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => setSides((s) => ({ ...s, [slot]: null }))}
                          aria-label={`Remove ${slot} side photo`}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addSide(slot)}
                        className="w-full h-20 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 text-xs flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-transform"
                      >
                        <span className="text-lg leading-none">＋</span>
                        {slot === 'left' ? 'Left side' : 'Right side'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opt-in AI-training consent. Purely additive: unticked keeps the
              photo transient exactly as before. */}
          {!tooDark && !noFace && !poorQuality && !validating && (
            <label className="mx-4 mt-3 flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={trainingConsent}
                onChange={(e) => setTrainingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[var(--color-primary)]"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Help improve Kira&rsquo;s accuracy for melanin-rich skin — allow anonymous
                use of my scan for AI training. Optional.{' '}
                <a
                  href="https://kirascan.app/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-gray-600"
                  onClick={(e) => e.stopPropagation()}
                >
                  Learn more
                </a>
              </span>
            </label>
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

    if (mode === 'loading') {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Accessing camera...</p>
        </div>
      );
    }

    if (mode === 'camera' && stream) {
      return (
        <div className="flex-1 flex flex-col">
          {flashing && <div className="fixed inset-0 z-[60] bg-white" aria-hidden="true" />}
          <CameraView stream={stream} onCapture={runCapture} videoRef={videoRef} />
          <button
            onClick={() => {
              if (stream) stopCamera(stream);
              setStream(null);
              setMode('choose');
            }}
            className="py-2.5 text-center text-[var(--color-primary)] text-sm font-medium"
          >
            ← Use a photo instead (recommended)
          </button>
        </div>
      );
    }

    // Default: chooser — Upload (recommended) vs live scanner
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[var(--color-primary)]">Add a photo of your face</h2>
          <p className="text-sm text-gray-500 max-w-[300px]">
            A clear, well-lit photo gives the most accurate skin analysis.
          </p>
        </div>

        {liveError && <p className="text-xs text-amber-600 max-w-[300px]">{liveError}</p>}

        <div className="w-full max-w-[300px] space-y-3 pt-1">
          <button
            onClick={openNativeUpload}
            className="relative w-full py-3.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Upload a Photo
            <span className="absolute -top-2.5 right-3 bg-[var(--color-accent)] text-[var(--color-primary)] text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              Recommended
            </span>
          </button>
          <p className="text-xs text-gray-400">Uses your phone’s camera for the sharpest, clearest result</p>

          <button
            onClick={startLiveScanner}
            className="w-full py-3 border border-gray-300 text-gray-600 rounded-xl font-medium text-sm active:scale-[0.98] transition-transform"
          >
            Use live scanner instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={sideInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleSideFile}
        className="hidden"
      />
      {renderInner()}
    </div>
  );
}
