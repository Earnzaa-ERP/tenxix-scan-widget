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

// ---- Face-region quality -------------------------------------------------
//
// Whole-frame brightness can pass while the FACE is underexposed, hazy, or
// soft (a lit wall behind a dim face lifts the average). So we assess just the
// detected face box.
//
// FAIRNESS: we do NOT threshold on absolute darkness — that would penalise
// well-lit dark skin. We crop the face, DOWNSAMPLE it (which averages out
// sensor noise), and measure:
//   - structure: luminance spread across the face. A well-exposed face of ANY
//     skin tone has highlights (nose/forehead/cheeks) and shadows (eye sockets)
//     → healthy spread. An underexposed/hazy face collapses to a flat band.
//   - sharpness: variance of a Laplacian on the denoised crop → low when soft
//     or out of focus.
// Both are computed on the denoised crop so grain doesn't masquerade as detail.
//
// Thresholds are conservative starting points — they err toward letting
// borderline photos through and want calibration against real device samples.
// Everything fails open.

const FACE_SAMPLE = 48;       // denoised crop dimension
const STRUCTURE_MIN = 20;     // min luminance spread across the face
const SHARPNESS_MIN = 12;     // min Laplacian variance (severe blur only)

export interface FaceQuality {
  structure: number;
  sharpness: number;
  poor: boolean;
}

export async function assessFaceRegion(
  base64: string,
  box: { x: number; y: number; width: number; height: number },
): Promise<FaceQuality> {
  const img = await loadImage(base64);

  // Pad the box ~10% and clamp to the image bounds.
  const pad = 0.1;
  const x = Math.max(0, box.x - box.width * pad);
  const y = Math.max(0, box.y - box.height * pad);
  const w = Math.min(img.naturalWidth - x, box.width * (1 + 2 * pad));
  const h = Math.min(img.naturalHeight - y, box.height * (1 + 2 * pad));
  if (w <= 1 || h <= 1) return { structure: 999, sharpness: 999, poor: false };

  const canvas = document.createElement('canvas');
  canvas.width = FACE_SAMPLE;
  canvas.height = FACE_SAMPLE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, x, y, w, h, 0, 0, FACE_SAMPLE, FACE_SAMPLE); // downsample = denoise

  const { data } = ctx.getImageData(0, 0, FACE_SAMPLE, FACE_SAMPLE);
  const luma = new Float32Array(FACE_SAMPLE * FACE_SAMPLE);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    luma[p] = l;
    sum += l;
  }
  const mean = sum / luma.length;

  let varSum = 0;
  for (let p = 0; p < luma.length; p++) varSum += (luma[p] - mean) ** 2;
  const structure = Math.sqrt(varSum / luma.length);

  // Laplacian variance (4-neighbour) over the interior.
  let lapSum = 0;
  let lapSumSq = 0;
  let n = 0;
  for (let yy = 1; yy < FACE_SAMPLE - 1; yy++) {
    for (let xx = 1; xx < FACE_SAMPLE - 1; xx++) {
      const idx = yy * FACE_SAMPLE + xx;
      const lap =
        4 * luma[idx] - luma[idx - 1] - luma[idx + 1] - luma[idx - FACE_SAMPLE] - luma[idx + FACE_SAMPLE];
      lapSum += lap;
      lapSumSq += lap * lap;
      n++;
    }
  }
  const lapMean = lapSum / n;
  const sharpness = lapSumSq / n - lapMean * lapMean;

  const poor = structure < STRUCTURE_MIN || sharpness < SHARPNESS_MIN;
  return { structure, sharpness, poor };
}
