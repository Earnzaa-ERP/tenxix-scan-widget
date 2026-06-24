import { useEffect, useRef, useState } from 'react';
import { startFaceTracking } from '../lib/faceDetect';

interface CameraViewProps {
  stream: MediaStream;
  onCapture: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

// Oval geometry — single source of truth for BOTH the CSS guide and the
// framing math, so what we accept matches what the user sees. Ratios are of
// the container WIDTH (CSS margin/size percentages are width-relative).
const OVAL_W = 0.78; // oval width / container width
const OVAL_TOP = 0.08; // oval top margin / container width
const OVAL_ASPECT = 4 / 3; // height / width

// Framing acceptance (in on-screen, object-cover-corrected coordinates).
const FACE_MIN_H = 0.4; // face height / view height — closer than this is fine
const FACE_MAX_H = 0.95; // overflowing above this
const CENTER_ACCEPT = 0.55; // face center must be within this ellipse fraction
const TICK_MS = 200;
const HOLD_TICKS = 5; // ~1s held inside the oval before auto-capture

export function CameraView({ stream, onCapture, videoRef }: CameraViewProps) {
  const attached = useRef(false);
  const firedRef = useRef(false);
  const stableRef = useRef(0);
  const [framed, setFramed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState('Fit your face inside the oval');

  useEffect(() => {
    const video = videoRef.current;
    if (video && !attached.current) {
      video.srcObject = stream;
      attached.current = true;
    }
    return () => {
      attached.current = false;
    };
  }, [stream, videoRef]);

  // Live framing feedback + hold-to-capture.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reset = (msg: string) => {
      stableRef.current = 0;
      setFramed(false);
      setProgress(0);
      setHint(msg);
    };

    const stop = startFaceTracking(
      video,
      (box) => {
        if (firedRef.current) return;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cw = video.clientWidth;
        const ch = video.clientHeight;
        if (!box || !vw || !vh || !cw || !ch) {
          reset('Fit your face inside the oval');
          return;
        }

        // Map the face box from sensor pixels into on-screen coordinates,
        // accounting for object-fit: cover (crop) and the mirror flip.
        const scale = Math.max(cw / vw, ch / vh);
        const offX = (vw * scale - cw) / 2;
        const offY = (vh * scale - ch) / 2;
        const fcx = box.x + box.width / 2;
        const fcy = box.y + box.height / 2;
        const nx = 1 - (fcx * scale - offX) / cw; // mirror X
        const ny = (fcy * scale - offY) / ch;
        const faceH = (box.height * scale) / ch;

        // Oval position/radii in the same normalized on-screen space.
        const ovalWpx = OVAL_W * cw;
        const ovalHpx = ovalWpx * OVAL_ASPECT;
        const ox = 0.5;
        const oy = (OVAL_TOP * cw + ovalHpx / 2) / ch;
        const rx = ovalWpx / 2 / cw;
        const ry = ovalHpx / 2 / ch;
        const ellipse = ((nx - ox) / rx) ** 2 + ((ny - oy) / ry) ** 2;

        let problem: string | null = null;
        if (faceH < FACE_MIN_H) problem = 'Move a little closer';
        else if (faceH > FACE_MAX_H) problem = 'Move back a little';
        else if (ellipse > CENTER_ACCEPT) problem = 'Fit your face inside the oval';

        if (problem) {
          reset(problem);
          return;
        }

        setFramed(true);
        stableRef.current += 1;
        const p = Math.min(1, stableRef.current / HOLD_TICKS);
        setProgress(p);
        setHint('Hold still…');
        if (stableRef.current >= HOLD_TICKS) {
          firedRef.current = true;
          onCapture();
        }
      },
      TICK_MS,
    );

    return stop;
  }, [videoRef, onCapture]);

  function handleManual() {
    if (firedRef.current) return;
    firedRef.current = true;
    onCapture();
  }

  return (
    <div className="relative flex-1 flex flex-col bg-black overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 object-cover scale-x-[-1]"
        // Brighten the PREVIEW only so users can see to frame in dim light.
        // The captured still is taken from the raw camera, unaffected by this.
        style={{ filter: 'brightness(1.4) contrast(1.05)' }}
      />

      {/* Oval framing guide — white while aligning, green while it locks. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center">
        <div
          className="rounded-[50%] transition-colors duration-150"
          style={{
            width: `${OVAL_W * 100}%`,
            marginTop: `${OVAL_TOP * 100}%`,
            aspectRatio: '3 / 4',
            border: `${framed ? 4 : 2}px solid ${framed ? '#22c55e' : 'rgba(255,255,255,0.95)'}`,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }}
        />
        <p
          className="mt-4 text-white text-sm font-medium text-center px-6"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}
        >
          {hint}
        </p>
        {/* Hold-still progress (Opay/KYC style) — fills before capture. */}
        <div className="mt-3 h-1.5 w-36 rounded-full bg-white/25 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress * 100}%`, background: '#22c55e', transition: 'width 0.18s linear' }}
          />
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <button
          onClick={handleManual}
          className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 shadow-lg active:scale-95 transition-transform"
          aria-label="Take photo"
        >
          <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-400 mx-auto" />
        </button>
      </div>
    </div>
  );
}
