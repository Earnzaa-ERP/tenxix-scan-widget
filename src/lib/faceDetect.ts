// Face-presence check so a well-lit photo of something that ISN'T a face
// (a wall, a hand, the ceiling) can't slip past into a bogus AI analysis.
//
// Uses MediaPipe Tasks Vision (BlazeFace) — the browser-WASM cousin of the
// app's native ML Kit. Loaded lazily from CDN at runtime (no build-time
// dependency), and runs ENTIRELY in the browser, so the skin photo is never
// uploaded for detection.
//
// Fails open: if the model/WASM can't load for any reason, detectFace returns
// true (treat as "face present / unknown") so we never block a real user on a
// network or CDN hiccup — same philosophy as the brightness gate.

const TASKS_VISION_ESM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10/+esm';
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

// Minimal shapes of the bits of the library we touch (avoids pulling types).
interface MpBoundingBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
}
interface MpDetection {
  boundingBox?: MpBoundingBox;
}
interface MpFaceDetector {
  detect(image: HTMLImageElement): { detections: MpDetection[] };
}
interface TasksVisionModule {
  FilesetResolver: { forVisionTasks(wasmBase: string): Promise<unknown> };
  FaceDetector: {
    createFromOptions(fileset: unknown, options: unknown): Promise<MpFaceDetector>;
  };
}

/** Bounding box of a detected face, in source-image pixels. */
export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface FaceResult {
  hasFace: boolean;
  box: FaceBox | null;
}

let detectorPromise: Promise<MpFaceDetector | null> | null = null;

async function buildDetector(): Promise<MpFaceDetector | null> {
  try {
    const specifier = TASKS_VISION_ESM; // variable so the bundler leaves it as a runtime import
    const mod = (await import(/* @vite-ignore */ specifier)) as unknown as TasksVisionModule;
    const fileset = await mod.FilesetResolver.forVisionTasks(WASM_BASE);
    return await mod.FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    });
  } catch {
    return null; // fail open
  }
}

/** Kick off model load early (e.g. when the camera opens) so it's warm at capture. */
export function prewarmFaceDetector(): void {
  if (!detectorPromise) detectorPromise = buildDetector();
}

function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

// hasFace defaults to true when detection is unavailable (fail open); box is
// null in that case so the face-region quality check is simply skipped.
export async function detectFace(base64: string): Promise<FaceResult> {
  if (!detectorPromise) detectorPromise = buildDetector();
  try {
    const detector = await detectorPromise;
    if (!detector) return { hasFace: true, box: null }; // model unavailable → don't block
    const img = await loadImage(base64);
    const det = detector.detect(img).detections[0];
    if (!det || !det.boundingBox) return { hasFace: false, box: null };
    const bb = det.boundingBox;
    return { hasFace: true, box: { x: bb.originX, y: bb.originY, width: bb.width, height: bb.height } };
  } catch {
    return { hasFace: true, box: null }; // never block on a detection error
  }
}
