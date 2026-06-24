import { useEffect, useRef } from 'react';

interface CameraViewProps {
  stream: MediaStream;
  onCapture: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function CameraView({ stream, onCapture, videoRef }: CameraViewProps) {
  const attached = useRef(false);

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

  return (
    <div className="relative flex-1 flex flex-col bg-black overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 object-cover scale-x-[-1]"
      />

      {/* Oval framing guide — darkens everything outside the ellipse so the
          user centers just their face inside it. Purely visual; clicks pass
          through to the capture button below. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center">
        <div
          className="mt-[14%] rounded-[50%]"
          style={{
            width: '64%',
            aspectRatio: '3 / 4',
            border: '2px solid rgba(141,253,0,0.9)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }}
        />
        <p
          className="mt-4 text-white text-sm font-medium text-center px-6"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}
        >
          Position your face within the oval
        </p>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <button
          onClick={onCapture}
          className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 shadow-lg active:scale-95 transition-transform"
          aria-label="Take photo"
        >
          <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-400 mx-auto" />
        </button>
      </div>
    </div>
  );
}
