// Camera helpers. Standards: W3C Media Capture and Streams (constraints,
// continuous autofocus) and W3C MediaStream Image Capture (full-resolution
// stills via ImageCapture.takePhoto).

export async function requestCamera(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // Request a high resolution so skin detail survives — more pixels on the
    // face means impurities (marks, texture) stay visible after crop.
    video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } },
    audio: false,
  });

  // Best-effort: continuous autofocus where the device supports it (Android
  // Chrome mostly; iOS Safari ignores). Never fatal.
  try {
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities?.() as { focusMode?: string[] } | undefined;
    if (caps?.focusMode?.includes('continuous')) {
      await track.applyConstraints({
        advanced: [{ focusMode: 'continuous' }],
      } as unknown as MediaTrackConstraints);
    }
  } catch {
    /* ignore — control not supported */
  }

  return stream;
}

// Grab the current preview frame to a JPEG base64 (no data: prefix).
export function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
}

interface ImageCaptureLike {
  takePhoto(): Promise<Blob>;
}
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

async function blobToBase64(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.92).replace(/^data:image\/jpeg;base64,/, '');
}

// Full-resolution still via ImageCapture where supported, else the preview
// frame. Returns JPEG base64 (no data: prefix).
export async function captureStill(video: HTMLVideoElement, stream: MediaStream): Promise<string> {
  const track = stream.getVideoTracks()[0];
  const Ctor = (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
  if (track && Ctor) {
    try {
      const blob = await new Ctor(track).takePhoto();
      return await blobToBase64(blob);
    } catch {
      /* fall through to frame grab */
    }
  }
  return captureFrame(video);
}

export function stopCamera(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop());
}
