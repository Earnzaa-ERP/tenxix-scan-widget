import { FUNCTIONS_BASE, SUPABASE_ANON_KEY, ANALYZE_TIMEOUT_MS } from './constants';
import type { WidgetConfig, ScanResult, BundleOrderPayload, BundleOrderResponse } from './types';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export type ApiErrorCode = 'invalid_ref' | 'rate_limit' | 'ai_failure' | 'timeout' | 'network' | 'unknown';

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
  return data as ScanResult;
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
