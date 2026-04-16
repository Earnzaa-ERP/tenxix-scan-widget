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
    <div className="relative flex-1 flex flex-col bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 object-cover scale-x-[-1]"
      />
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
