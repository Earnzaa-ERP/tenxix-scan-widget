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

// ---- Face-region quality (ISO/IEC 29794-5 component measures) -------------
//
// Standard: ISO/IEC 29794-5 (Face image quality), as implemented by NIST OFIQ
// and used for ICAO/biometric capture. We assess the DETECTED FACE BOX (not
// the whole frame — a lit wall behind a dim face would otherwise pass) against
// the standard's component measures: exposure, dynamic range, illumination
// uniformity, noise, and sharpness.
//
// FAIRNESS: none of these gate on absolute darkness, so well-lit dark skin
// always passes. Exposure is paired with dynamic range (a dark BUT well-lit
// face still has a wide tonal range); uniformity and noise are ratio/estimator
// based and skin-tone independent. Everything fails open.
//
// NOISE is why the earlier version failed: grain inflates spread and Laplacian
// "detail". We estimate sensor noise with Immerkær's method (1996) on the
// near-native crop, and measure sharpness on a denoised copy so grain can't
// pose as focus.

const FACE_RES = 160;          // max crop dimension — keep noise signal intact
// Thresholds per component (0-255 luma scale unless noted). Tunable via ?qa.
const EXPOSURE_MIN = 45;       // face mean luminance floor (with low DR)
const DYNAMIC_RANGE_MIN = 55;  // p95 - p5 of face luminance
const UNIFORMITY_MAX = 0.34;   // max |left-right| / brighter-half luminance
const NOISE_MAX = 6.0;         // max estimated noise sigma
const SHARPNESS_MIN = 14;      // min Laplacian variance on the denoised crop

export interface FaceQuality {
  exposure: number;
  dynamicRange: number;
  uniformity: number; // 0 = even, 1 = fully one-sided
  noise: number;
  sharpness: number;
  poor: boolean;
}

export async function assessFaceRegion(
  base64: string,
  box: { x: number; y: number; width: number; height: number },
): Promise<FaceQuality> {
  const img = await loadImage(base64);

  // Pad the box ~8% and clamp to the image bounds.
  const pad = 0.08;
  const sx = Math.max(0, box.x - box.width * pad);
  const sy = Math.max(0, box.y - box.height * pad);
  const sw = Math.min(img.naturalWidth - sx, box.width * (1 + 2 * pad));
  const sh = Math.min(img.naturalHeight - sy, box.height * (1 + 2 * pad));
  const ok: FaceQuality = { exposure: 255, dynamicRange: 255, uniformity: 0, noise: 0, sharpness: 999, poor: false };
  if (sw <= 2 || sh <= 2) return ok;

  const scale = Math.min(FACE_RES / sw, FACE_RES / sh, 1);
  const W = Math.max(3, Math.round(sw * scale));
  const H = Math.max(3, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

  const { data } = ctx.getImageData(0, 0, W, H);
  const luma = new Float32Array(W * H);
  let sum = 0;
  let leftSum = 0;
  let rightSum = 0;
  let leftN = 0;
  let rightN = 0;
  const half = W / 2;
  for (let p = 0, i = 0; p < luma.length; p++, i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    luma[p] = l;
    sum += l;
    if (p % W < half) {
      leftSum += l;
      leftN++;
    } else {
      rightSum += l;
      rightN++;
    }
  }
  const exposure = sum / luma.length;

  // Dynamic range: robust p5..p95 spread.
  const sorted = Float32Array.from(luma).sort();
  const p5 = sorted[Math.floor(0.05 * sorted.length)];
  const p95 = sorted[Math.floor(0.95 * sorted.length)];
  const dynamicRange = p95 - p5;

  // Illumination uniformity: left vs right brightness imbalance (shadowed side).
  const meanL = leftSum / Math.max(1, leftN);
  const meanR = rightSum / Math.max(1, rightN);
  const uniformity = Math.abs(meanL - meanR) / Math.max(1, meanL, meanR);

  // Noise sigma — Immerkær (1996) fast noise variance estimate.
  let nAcc = 0;
  let nCount = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const c = y * W + x;
      const v =
        4 * luma[c] -
        2 * (luma[c - 1] + luma[c + 1] + luma[c - W] + luma[c + W]) +
        (luma[c - W - 1] + luma[c - W + 1] + luma[c + W - 1] + luma[c + W + 1]);
      nAcc += Math.abs(v);
      nCount++;
    }
  }
  const noise = nCount ? (Math.sqrt(Math.PI / 2) * nAcc) / (6 * nCount) : 0;

  // Sharpness on a 3x3 box-blurred (denoised) copy, so noise can't pose as focus.
  const blur = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const c = y * W + x;
      blur[c] =
        (luma[c] + luma[c - 1] + luma[c + 1] + luma[c - W] + luma[c + W] +
          luma[c - W - 1] + luma[c - W + 1] + luma[c + W - 1] + luma[c + W + 1]) / 9;
    }
  }
  let lapSum = 0;
  let lapSumSq = 0;
  let lapN = 0;
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const c = y * W + x;
      const lap = 4 * blur[c] - blur[c - 1] - blur[c + 1] - blur[c - W] - blur[c + W];
      lapSum += lap;
      lapSumSq += lap * lap;
      lapN++;
    }
  }
  const sharpness = lapN ? lapSumSq / lapN - (lapSum / lapN) ** 2 : 999;

  const poor =
    (exposure < EXPOSURE_MIN && dynamicRange < DYNAMIC_RANGE_MIN) || // under-exposed AND flat
    dynamicRange < DYNAMIC_RANGE_MIN * 0.6 || // severely flat regardless
    uniformity > UNIFORMITY_MAX ||            // one side in shadow
    noise > NOISE_MAX ||                      // grainy / low-light sensor noise
    sharpness < SHARPNESS_MIN;                // soft / out of focus

  return { exposure, dynamicRange, uniformity, noise, sharpness, poor };
}

// Crop a JPEG to the face with generous, asymmetric margins so the FULL face —
// including the forehead/hairline (prime skin area) — is kept, not clipped.
// The detector box starts near the eyebrows, so we extend extra ABOVE it.
// Standard: ICAO 9303 / ISO-IEC 19794-5 face-geometry framing. Returns JPEG
// base64 (no data: prefix).
export async function cropFace(
  base64: string,
  box: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const MARGIN_X = 0.3;
  const MARGIN_TOP = 0.6; // extra headroom so the forehead isn't cut
  const MARGIN_BOTTOM = 0.35;

  const img = await loadImage(base64);
  const left = Math.max(0, box.x - box.width * MARGIN_X);
  const right = Math.min(img.naturalWidth, box.x + box.width * (1 + MARGIN_X));
  const top = Math.max(0, box.y - box.height * MARGIN_TOP);
  const bottom = Math.min(img.naturalHeight, box.y + box.height * (1 + MARGIN_BOTTOM));
  const w = right - left;
  const h = bottom - top;
  if (w < 2 || h < 2) return base64;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, left, top, w, h, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.92).replace(/^data:image\/jpeg;base64,/, '');
}
