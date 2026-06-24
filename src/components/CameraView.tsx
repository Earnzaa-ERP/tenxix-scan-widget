import { useEffect, useRef, useState } from 'react';
import { startFaceTracking } from '../lib/faceDetect';

interface CameraViewProps {
  stream: MediaStream;
  onCapture: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

// ICAO/ISO-style framing targets (normalized): the face should fill a good
// share of the frame and be centered in the oval before we auto-capture.
// Skin capture wants the face CLOSE and filling the frame for maximum detail —
// not a passport-style whole-head shot. So accept a large, face-filling crop;
// only nudge "move closer" when the face is genuinely small, or "move back"
// when it overflows the frame. The top of the head/hair may sit outside the
// oval — that's fine, we care about facial skin.
const MIN_FACE_H = 0.45; // face height / frame height — "move closer" below this
const MAX_FACE_H = 0.98; // "move back" only when the face overflows
const CENTER_TOL_X = 0.22;
const CENTER_TOL_Y = 0.24;
const OVAL_CENTER_Y = 0.46; // oval sits slightly above center
const STABLE_TICKS = 2; // consecutive good frames (~700ms) before auto-firing

export function CameraView({ stream, onCapture, videoRef }: CameraViewProps) {
  const attached = useRef(false);
  const firedRef = useRef(false);
  const stableRef = useRef(0);
  const [framed, setFramed] = useState(false);
  const [hint, setHint] = useState('Position your face within the oval');

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

  // Live framing feedback + auto-capture.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const stop = startFaceTracking(video, (box) => {
      if (firedRef.current) return;
      const fw = video.videoWidth;
      const fh = video.videoHeight;
      if (!box || !fw || !fh) {
        stableRef.current = 0;
        setFramed(false);
        setHint('Position your face within the oval');
        return;
      }
      const sizeH = box.height / fh;
      const cx = (box.x + box.width / 2) / fw;
      const cy = (box.y + box.height / 2) / fh;

      let problem: string | null = null;
      if (sizeH < MIN_FACE_H) problem = 'Move a little closer';
      else if (sizeH > MAX_FACE_H) problem = 'Move back a little';
      else if (Math.abs(cx - 0.5) > CENTER_TOL_X || Math.abs(cy - OVAL_CENTER_Y) > CENTER_TOL_Y)
        problem = 'Center your face in the oval';

      if (problem) {
        stableRef.current = 0;
        setFramed(false);
        setHint(problem);
        return;
      }

      setFramed(true);
      setHint('Hold still…');
      stableRef.current += 1;
      if (stableRef.current >= STABLE_TICKS) {
        firedRef.current = true;
        onCapture();
      }
    });

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

      {/* Oval framing guide — darkens outside the ellipse; turns green when
          the face is well framed and about to auto-capture. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center">
        <div
          className="mt-[8%] rounded-[50%] transition-colors duration-200"
          style={{
            width: '78%',
            aspectRatio: '3 / 4',
            // White = align your face; green = locked & about to capture.
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
