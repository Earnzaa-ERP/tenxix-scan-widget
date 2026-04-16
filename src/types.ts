export interface ConfigProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  skin_concern_targets: string[];
  redirect_url: string | null;
}

export interface WidgetConfig {
  ref_code: string;
  brand: { id: string; name: string; slug: string } | null;
  products: ConfigProduct[];
}

export interface RecommendedProduct {
  id: string | null;
  name: string;
  price: number | null;
  redirect_url: string | null;
}

export interface ScanResult {
  outcome: 'match' | 'redirect' | 'combo';
  headline: string;
  explanation: string;
  skin_concerns: string[];
  recommended_products: RecommendedProduct[];
}

export type Screen = 'intro' | 'capture' | 'analyzing' | 'result';

export interface AppState {
  screen: Screen;
  refCode: string | null;
  productName: string | null;
  config: WidgetConfig | null;
  configLoading: boolean;
  configError: string | null;
  photoBase64: string | null;
  result: ScanResult | null;
  analyzeError: string | null;
  sessionId: string;
  deviceType: string;
}

export type AppAction =
  | { type: 'CONFIG_LOADING' }
  | { type: 'CONFIG_LOADED'; config: WidgetConfig }
  | { type: 'CONFIG_ERROR'; error: string }
  | { type: 'START_SCAN' }
  | { type: 'PHOTO_READY'; photoBase64: string }
  | { type: 'ANALYZE_SUCCESS'; result: ScanResult }
  | { type: 'ANALYZE_ERROR'; error: string }
  | { type: 'SCAN_AGAIN' };
