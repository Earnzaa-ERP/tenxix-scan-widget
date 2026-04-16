import { useEffect, useRef } from 'react';
import { ScanAnimation } from '../components/ScanAnimation';
import { analyzeSkinScan, ApiError } from '../api';
import type { ScanResult } from '../types';

interface AnalyzingScreenProps {
  refCode: string;
  photoBase64: string;
  productName: string | null;
  sessionId: string;
  deviceType: string;
  onResult: (result: ScanResult) => void;
  onError: (error: string) => void;
}

export function AnalyzingScreen({
  refCode,
  photoBase64,
  productName,
  sessionId,
  deviceType,
  onResult,
  onError,
}: AnalyzingScreenProps) {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    analyzeSkinScan({
      ref_code: refCode,
      photo_base64: photoBase64,
      product_name: productName ?? undefined,
      session_id: sessionId,
      device_type: deviceType,
    })
      .then(onResult)
      .catch((err) => {
        const message =
          err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
        onError(message);
      });
  }, [refCode, photoBase64, productName, sessionId, deviceType, onResult, onError]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
      <ScanAnimation />
      <div className="text-center space-y-2">
        <p className="text-[var(--color-primary)] font-semibold text-lg">Analyzing your skin...</p>
        <p className="text-gray-400 text-sm">This usually takes a few seconds</p>
      </div>
    </div>
  );
}
