import {
  MAX_PHOTO_BYTES,
  MAX_PHOTO_WIDTH,
  MAX_PHOTO_HEIGHT,
  JPEG_QUALITY_START,
  JPEG_QUALITY_STEP,
  JPEG_QUALITY_MIN,
} from '../constants';

function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

function canvasToBase64(canvas: HTMLCanvasElement, quality: number): string {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
}

function base64ByteSize(b64: string): number {
  return Math.ceil((b64.length * 3) / 4);
}

export async function compressPhoto(base64: string): Promise<string> {
  const img = await loadImage(base64);

  let w = img.naturalWidth;
  let h = img.naturalHeight;

  if (w > MAX_PHOTO_WIDTH || h > MAX_PHOTO_HEIGHT) {
    const scale = Math.min(MAX_PHOTO_WIDTH / w, MAX_PHOTO_HEIGHT / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  let quality = JPEG_QUALITY_START;
  let result = canvasToBase64(canvas, quality);

  while (base64ByteSize(result) > MAX_PHOTO_BYTES && quality > JPEG_QUALITY_MIN) {
    quality -= JPEG_QUALITY_STEP;
    result = canvasToBase64(canvas, quality);
  }

  return result;
}
