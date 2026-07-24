import { FUNCTIONS_BASE, SUPABASE_ANON_KEY, ANALYZE_TIMEOUT_MS } from './constants';
import type { WidgetConfig, ScanResult, RecommendedProduct, Regimen, RegimenStep, CurrentProductVerdict, BundleOrderPayload, BundleOrderResponse, SkinReport, ReportConcern, MetricKey } from './types';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export type ApiErrorCode = 'invalid_ref' | 'rate_limit' | 'ai_failure' | 'timeout' | 'network' | 'unknown';

// The AI sometimes returns JSON that parses but has an unexpected shape — a
// missing concerns array, a null product, a non-string field. Without this the
// result screen would dereference result.skin_concerns.map(), product.name,
// etc. and throw a TypeError, crashing the whole widget. Sanitizing at fetch
// time lets every downstream render path trust the data.
function sanitizeScanResult(raw: unknown): ScanResult {
  const r = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};

  const validOutcomes: ScanResult['outcome'][] = ['match', 'redirect', 'combo'];
  const outcome = validOutcomes.includes(r.outcome as ScanResult['outcome'])
    ? (r.outcome as ScanResult['outcome'])
    : 'match';

  const skin_concerns = Array.isArray(r.skin_concerns)
    ? r.skin_concerns.filter((c: unknown): c is string => typeof c === 'string' && c.length > 0)
    : [];

  const recommended_products = Array.isArray(r.recommended_products)
    ? r.recommended_products
        .filter(
          (p: unknown): p is Record<string, unknown> =>
            !!p && typeof p === 'object' && typeof (p as Record<string, unknown>).name === 'string' &&
            ((p as Record<string, unknown>).name as string).length > 0,
        )
        .map((p): RecommendedProduct => ({
          id: typeof p.id === 'string' ? p.id : null,
          name: p.name as string,
          price: typeof p.price === 'number' ? p.price : null,
          redirect_url: typeof p.redirect_url === 'string' ? p.redirect_url : null,
          why_it_matches: typeof p.why_it_matches === 'string' ? p.why_it_matches : null,
        }))
    : [];

  const regimen = sanitizeRegimen(r.regimen);
  const current_product = sanitizeCurrentProduct(r.current_product);
  const report = sanitizeReport(r.report);

  return {
    outcome,
    ...(current_product ? { current_product } : {}),
    ...(typeof r.headline_finding === 'string' && r.headline_finding ? { headline_finding: r.headline_finding } : {}),
    headline: typeof r.headline === 'string' ? r.headline : '',
    explanation: typeof r.explanation === 'string' ? r.explanation : '',
    skin_concerns,
    recommended_products,
    ...(regimen ? { regimen } : {}),
    ...(report ? { report } : {}),
  };
}

const METRIC_KEYS: MetricKey[] = ['hydration', 'pigmentation', 'pores', 'wrinkles', 'elasticity', 'texture', 'radiance'];

function sanitizeReport(raw: unknown): SkinReport | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;

  const score = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null;

  const metricsRaw = (r.metrics && typeof r.metrics === 'object' ? r.metrics : {}) as Record<string, unknown>;
  const metrics: Partial<Record<MetricKey, number | null>> = {};
  for (const k of METRIC_KEYS) metrics[k] = score(metricsRaw[k]);

  const concerns: ReportConcern[] = Array.isArray(r.concerns)
    ? r.concerns
        .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object' && typeof (c as Record<string, unknown>).name === 'string')
        .map((c) => ({
          name: c.name as string,
          severity: (['mild', 'moderate', 'significant'] as const).includes(c.severity as ReportConcern['severity'])
            ? (c.severity as ReportConcern['severity'])
            : 'mild',
          detail: typeof c.detail === 'string' ? c.detail : '',
        }))
    : [];

  const overall = score(r.overall_score);
  // A report with no score AND no summary is useless — fall back to the
  // simple headline view rather than rendering an empty shell.
  const summary = typeof r.summary === 'string' ? r.summary : '';
  if (overall === null && summary.length === 0) return undefined;

  return {
    overall_score: overall,
    skin_type: typeof r.skin_type === 'string' ? r.skin_type : null,
    fitzpatrick: typeof r.fitzpatrick === 'number' && Number.isFinite(r.fitzpatrick)
      ? Math.max(1, Math.min(6, Math.round(r.fitzpatrick)))
      : null,
    estimated_age: typeof r.estimated_age === 'number' && Number.isFinite(r.estimated_age)
      ? Math.round(r.estimated_age)
      : null,
    metrics,
    summary,
    concerns,
    strengths: Array.isArray(r.strengths) ? r.strengths.filter((s): s is string => typeof s === 'string' && s.length > 0) : [],
  };
}

function sanitizeCurrentProduct(raw: unknown): CurrentProductVerdict | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || r.name.length === 0) return undefined;
  const fit = (['great', 'partial', 'poor'] as const).includes(r.fit as CurrentProductVerdict['fit'])
    ? (r.fit as CurrentProductVerdict['fit'])
    : 'partial';
  const guidance = (['enough', 'add', 'replace'] as const).includes(r.guidance as CurrentProductVerdict['guidance'])
    ? (r.guidance as CurrentProductVerdict['guidance'])
    : 'add';
  return {
    name: r.name,
    fit,
    reason: typeof r.reason === 'string' ? r.reason : '',
    guidance,
  };
}

function sanitizeRegimen(raw: unknown): Regimen | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;

  const cleanSteps = (arr: unknown): RegimenStep[] =>
    Array.isArray(arr)
      ? arr
          .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
          .map((s): RegimenStep => {
            const p = (s.product && typeof s.product === 'object' ? s.product : {}) as Record<string, unknown>;
            return {
              type: typeof s.type === 'string' ? s.type : '',
              instruction: typeof s.instruction === 'string' ? s.instruction : '',
              why: typeof s.why === 'string' ? s.why : '',
              key_ingredients: Array.isArray(s.key_ingredients)
                ? s.key_ingredients.filter((k): k is string => typeof k === 'string')
                : [],
              product: {
                id: typeof p.id === 'string' ? p.id : null,
                name: typeof p.name === 'string' ? p.name : '',
                price: typeof p.price === 'number' ? p.price : null,
                redirect_url: typeof p.redirect_url === 'string' ? p.redirect_url : null,
              },
            };
          })
          .filter((s) => s.product.name.length > 0 || s.instruction.length > 0)
      : [];

  const morning = cleanSteps(r.morning);
  const evening = cleanSteps(r.evening);
  if (morning.length === 0 && evening.length === 0) return undefined; // nothing usable

  return {
    morning,
    evening,
    tips: Array.isArray(r.tips) ? r.tips.filter((t): t is string => typeof t === 'string') : [],
  };
}

export class ApiError extends Error {
  code: ApiErrorCode;

  constructor(message: string, code: ApiErrorCode) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export async function fetchWidgetConfig(refCode: string): Promise<WidgetConfig> {
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/get-scan-widget-config?ref=${encodeURIComponent(refCode)}`, {
      headers,
    });
  } catch {
    throw new ApiError('Could not load. Check your connection and refresh.', 'network');
  }

  if (!res.ok) {
    if (res.status === 404 || res.status === 400) {
      throw new ApiError('This scan is no longer available.', 'invalid_ref');
    }
    throw new ApiError('Could not load. Please try again.', 'unknown');
  }

  const data = await res.json();
  return (data.config ?? data) as WidgetConfig;
}

export async function analyzeSkinScan(params: {
  ref_code: string;
  photo_base64: string;
  side_images?: { left?: string; right?: string };
  product_name?: string;
  session_id?: string;
  device_type?: string;
}): Promise<ScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/analyze-skin-scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Analysis is taking too long. Please try again.', 'timeout');
    }
    throw new ApiError('Could not connect. Check your internet and try again.', 'network');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new ApiError("You've reached the scan limit. Please try again in an hour.", 'rate_limit');
    }
    if (res.status === 403) {
      throw new ApiError('This scan link is no longer valid.', 'invalid_ref');
    }
    throw new ApiError('Analysis could not be completed. Please try again.', 'ai_failure');
  }

  const data = await res.json();
  return sanitizeScanResult(data);
}

// Generates the AM/PM regimen (second, text-only AI call). Runs while the
// formulation animation plays in general mode. FAIL-SOFT by design: any
// error returns null and the reveal proceeds with recommendations only —
// a routine is a bonus, never a blocker.
export async function generateScanRegimen(params: {
  ref_code: string;
  skin_concerns: string[];
  product_names: string[];
}): Promise<Regimen | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${FUNCTIONS_BASE}/generate-scan-regimen`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return null;
    const data = await res.json();
    return sanitizeRegimen(data.regimen) ?? null;
  } catch {
    return null;
  }
}

export async function submitBundleOrder(payload: BundleOrderPayload): Promise<BundleOrderResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/submit-scan-order`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 'timeout');
    }
    throw new ApiError('Could not connect. Check your internet and try again.', 'network');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.error || 'Could not place your order. Please try again.', 'unknown');
  }

  const data = await res.json();
  return data as BundleOrderResponse;
}
