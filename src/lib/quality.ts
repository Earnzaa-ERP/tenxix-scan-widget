// Rejects unusable scan frames before they reach the AI. The main failure mode
// is a photo snapped in darkness: the model still returns a confident (bogus)
// result, which is worse than refusing. We detect a "blank/black" frame.
//
// IMPORTANT: this must NOT reject legitimately-lit dark skin. A real face — any
// Fitzpatrick type, auto-exposed by the camera — always carries feature
// contrast (eyes, highlights, edges), so its luminance variance is non-trivial.
// A dark-room frame is uniformly near-zero brightness AND near-zero variance.
// We gate on BOTH so skin tone alone never trips the check.

const SAMPLE_DIM = 80; // downscale for a fast, representative sample

export interface BrightnessStats {
  mean: number;   // average luminance, 0-255
  stdDev: number; // luminance spread — proxy for "is there a subject?"
  tooDark: boolean;
}

function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

export async function analyzeBrightness(base64: string): Promise<BrightnessStats> {
  const img = await loadImage(base64);

  const scale = Math.min(SAMPLE_DIM / img.naturalWidth, SAMPLE_DIM / img.naturalHeight, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const n = data.length / 4;

  let sum = 0;
  const lumas = new Float32Array(n);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Rec. 601 luma
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    lumas[p] = luma;
    sum += luma;
  }
  const mean = sum / n;

  let varSum = 0;
  for (let p = 0; p < n; p++) varSum += (lumas[p] - mean) ** 2;
  const stdDev = Math.sqrt(varSum / n);

  // Too dark if essentially black, OR dark AND featureless. Both rules require
  // low brightness; the second also requires low contrast so a dim-but-real
  // face (which still has highlights/edges) is allowed through.
  const tooDark = mean < 18 || (mean < 35 && stdDev < 16);

  return { mean, stdDev, tooDark };
}
