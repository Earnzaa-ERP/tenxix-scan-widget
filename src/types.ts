export interface ProductIngredient {
  name: string;
  explanation: string;
}

export interface ProductTestimonial {
  name: string;
  location: string;
  text: string;
  result: string;
  media_type?: 'before_after' | 'video' | 'none';
  before_url?: string;
  after_url?: string;
  video_url?: string;
}

export interface ConfigProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  skin_concern_targets: string[];
  redirect_url: string | null;
  full_description: string | null;
  ingredients: ProductIngredient[];
  testimonials: ProductTestimonial[];
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
  why_it_matches: string | null;
}

export interface RegimenStepProduct {
  id: string | null;
  name: string;
  price: number | null;
  redirect_url: string | null;
}

export interface RegimenStep {
  type: string; // CLEANSE | TREAT | MOISTURIZE | PROTECT
  instruction: string;
  why: string;
  key_ingredients: string[];
  product: RegimenStepProduct;
}

export interface Regimen {
  morning: RegimenStep[];
  evening: RegimenStep[];
  tips: string[];
}

export interface CurrentProductVerdict {
  name: string;
  fit: 'great' | 'partial' | 'poor';
  reason: string;
  guidance: 'enough' | 'add' | 'replace';
}

export interface ScanResult {
  outcome: 'match' | 'redirect' | 'combo';
  current_product?: CurrentProductVerdict | null;
  headline: string;
  explanation: string;
  skin_concerns: string[];
  recommended_products: RecommendedProduct[];
  regimen?: Regimen; // present once the backend returns it; UI falls back without it
}

// 'formulating' = general-mode interstitial: the formulation animation
// plays while the AM/PM regimen is generated, then recommendations reveal.
export type Screen = 'intro' | 'capture' | 'analyzing' | 'result' | 'formulating' | 'bundle_order' | 'order_success';

export interface BundleOrderPayload {
  ref_code: string;
  /** Campaign tracking code (?cmp= on the embed URL) — attributes the
   *  order to the buyer's campaign for MER / product P&L, like the
   *  order forms. Optional; ref_code alone still attributes the buyer. */
  cmp?: string;
  brand_id: string;
  product_ids: string[];
  items?: { product_id: string; quantity: number }[];
  full_name: string;
  phone: string;
  alt_phone?: string;
  state: string;
  city?: string;
  address?: string;
  landmark?: string;
  address_type?: 'home' | 'office';
  session_id?: string;
  device_type?: string;
}

export interface BundleOrderResponse {
  success: boolean;
  order_ref: string;
}

export interface AppState {
  screen: Screen;
  refCode: string | null;
  productName: string | null;
  /** Campaign tracking code from ?cmp= — passed through to the order. */
  cmp: string | null;
  /** General mode (no product param): recommendations stay hidden until
   *  the customer taps the floating "Get My Product Recommendations"
   *  button. Product mode reveals everything at once (revealed=true). */
  revealed: boolean;
  config: WidgetConfig | null;
  configLoading: boolean;
  configError: string | null;
  photoBase64: string | null;
  sideImagesBase64: { left?: string; right?: string } | null;
  result: ScanResult | null;
  cart: Record<string, number>; // productId -> quantity (selected on the result page)
  analyzeError: string | null;
  orderRef: string | null;
  orderError: string | null;
  sessionId: string;
  deviceType: string;
}

export type AppAction =
  | { type: 'CONFIG_LOADING' }
  | { type: 'CONFIG_LOADED'; config: WidgetConfig }
  | { type: 'CONFIG_ERROR'; error: string }
  | { type: 'START_SCAN' }
  | { type: 'PHOTO_READY'; photoBase64: string; sideImages?: { left?: string; right?: string } }
  | { type: 'ANALYZE_SUCCESS'; result: ScanResult }
  | { type: 'ANALYZE_ERROR'; error: string }
  | { type: 'SCAN_AGAIN' }
  | { type: 'CART_ADD'; productId: string }
  | { type: 'CART_SET'; productId: string; quantity: number }
  | { type: 'START_BUNDLE_ORDER' }
  | { type: 'ORDER_SUCCESS'; orderRef: string }
  | { type: 'ORDER_ERROR'; error: string }
  | { type: 'BACK_TO_RESULT' }
  | { type: 'REVEAL_START' }
  | { type: 'REVEAL_DONE'; regimen?: Regimen };
