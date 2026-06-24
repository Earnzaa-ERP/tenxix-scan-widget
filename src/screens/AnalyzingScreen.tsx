import { useEffect, useRef } from 'react';
import { AnalyzingAnimation } from '../components/AnalyzingAnimation';
import { analyzeSkinScan, ApiError } from '../api';
import type { ScanResult } from '../types';

interface AnalyzingScreenProps {
  refCode: string;
  photoBase64: string;
  sideImages?: { left?: string; right?: string };
  productName: string | null;
  sessionId: string;
  deviceType: string;
  onResult: (result: ScanResult) => void;
  onError: (error: string) => void;
}

export function AnalyzingScreen({
  refCode,
  photoBase64,
  sideImages,
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
      side_images: sideImages,
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
  }, [refCode, photoBase64, sideImages, productName, sessionId, deviceType, onResult, onError]);

  return <AnalyzingAnimation photoBase64={photoBase64} />;
}
