import { useCallback, useEffect, useReducer } from 'react';
import type { AppState, AppAction, ScanResult } from './types';
import { fetchWidgetConfig, generateScanRegimen } from './api';
import { generateSessionId, detectDeviceType } from './lib/session';
import { Layout } from './components/Layout';
import { AnalyzingAnimation } from './components/AnalyzingAnimation';
import { FormulationAnimation } from './components/FormulationAnimation';
import { IntroScreen } from './screens/IntroScreen';
import { CaptureScreen } from './screens/CaptureScreen';
import { AnalyzingScreen } from './screens/AnalyzingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { BundleOrderScreen } from './screens/BundleOrderScreen';
import { OrderSuccessScreen } from './screens/OrderSuccessScreen';

const params = new URLSearchParams(window.location.search);
const refCode = params.get('ref') || 'direct';
const productName = params.get('product');
// Campaign tracking code — same ?cmp= the buyers put in every ad URL.
// Optional; passed through to the order for campaign-level attribution.
const cmp = params.get('cmp');

// General mode = no product param: the button lives on a brand page, not
// a product page. Analysis shows first; recommendations reveal on tap.
const generalMode = !productName;

const initialState: AppState = {
  screen: 'intro',
  refCode,
  productName,
  cmp,
  revealed: !generalMode,
  config: null,
  configLoading: true,
  configError: null,
  photoBase64: null,
  sideImagesBase64: null,
  trainingConsent: false,
  result: null,
  cart: {},
  analyzeError: null,
  orderRef: null,
  orderError: null,
  sessionId: generateSessionId(),
  deviceType: detectDeviceType(),
};

// Auto-select the essential products into the cart the moment a scan result
// arrives — mirrors the app's "Shop Essentials". When the backend marks
// importance, essentials are pre-added (fallback: all, so the cart is never
// empty). Legacy backends that send no importance at all → empty cart
// (manual add, unchanged).
function defaultCart(result: ScanResult | null): Record<string, number> {
  if (!result) return {};
  const recs = result.recommended_products.filter((p) => p.id);
  if (!recs.some((p) => p.importance != null)) return {};
  const essentials = recs.filter((p) => p.importance === 'essential');
  const chosen = essentials.length > 0 ? essentials : recs;
  const cart: Record<string, number> = {};
  for (const p of chosen) if (p.id) cart[p.id] = 1;
  return cart;
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CONFIG_LOADING':
      return { ...state, configLoading: true, configError: null };
    case 'CONFIG_LOADED':
      return { ...state, configLoading: false, config: action.config };
    case 'CONFIG_ERROR':
      return { ...state, configLoading: false, configError: action.error };
    case 'START_SCAN':
      return state.screen === 'intro' ? { ...state, screen: 'capture' } : state;
    case 'PHOTO_READY':
      return state.screen === 'capture'
        ? { ...state, screen: 'analyzing', photoBase64: action.photoBase64, sideImagesBase64: action.sideImages ?? null, trainingConsent: action.trainingConsent ?? false, result: null, analyzeError: null }
        : state;
    case 'ANALYZE_SUCCESS':
      return state.screen === 'analyzing' ? { ...state, screen: 'result', result: action.result, cart: defaultCart(action.result) } : state;
    case 'ANALYZE_ERROR':
      return state.screen === 'analyzing' ? { ...state, screen: 'result', analyzeError: action.error } : state;
    case 'SCAN_AGAIN':
      return { ...state, screen: 'capture', photoBase64: null, sideImagesBase64: null, result: null, cart: {}, analyzeError: null, orderRef: null, orderError: null, revealed: !generalMode };
    case 'REVEAL_START':
      return state.screen === 'result' ? { ...state, screen: 'formulating' } : state;
    case 'REVEAL_DONE':
      return state.screen === 'formulating'
        ? {
            ...state,
            screen: 'result',
            revealed: true,
            result: state.result && action.regimen ? { ...state.result, regimen: action.regimen } : state.result,
          }
        : state;
    case 'CART_ADD':
      return { ...state, cart: { ...state.cart, [action.productId]: state.cart[action.productId] ?? 1 } };
    case 'CART_SET': {
      const next = { ...state.cart };
      const q = Math.max(0, Math.min(10, action.quantity));
      if (q <= 0) delete next[action.productId];
      else next[action.productId] = q;
      return { ...state, cart: next };
    }
    case 'START_BUNDLE_ORDER':
      return state.screen === 'result' ? { ...state, screen: 'bundle_order', orderError: null } : state;
    case 'ORDER_SUCCESS':
      return state.screen === 'bundle_order' ? { ...state, screen: 'order_success', orderRef: action.orderRef } : state;
    case 'ORDER_ERROR':
      return state.screen === 'bundle_order' ? { ...state, orderError: action.error } : state;
    case 'BACK_TO_RESULT':
      return state.screen === 'bundle_order' ? { ...state, screen: 'result', orderError: null } : state;
    default:
      return state;
  }
}

// Dev-only preview switch so the animation screens can be eyeballed in isolation
// (the real analyzing screen is gone in seconds, and the formulation animation
// isn't in the live flow yet). Harmless: only triggers with a ?preview= param.
const previewMode = params.get('preview');

export default function App() {
  if (previewMode === 'analyzing') {
    return <Layout><AnalyzingAnimation photoBase64={null} /></Layout>;
  }
  if (previewMode === 'formulation') {
    return <Layout><FormulationAnimation /></Layout>;
  }
  return <MainApp />;
}

function MainApp() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!state.refCode) return;
    fetchWidgetConfig(state.refCode)
      .then((config) => dispatch({ type: 'CONFIG_LOADED', config }))
      .catch((err) => dispatch({ type: 'CONFIG_ERROR', error: err.message }));
  }, [state.refCode]);

  const handleResult = useCallback((result: ScanResult) => {
    dispatch({ type: 'ANALYZE_SUCCESS', result });
  }, []);

  const handleAnalyzeError = useCallback((error: string) => {
    dispatch({ type: 'ANALYZE_ERROR', error });
  }, []);

  // General-mode reveal: the formulation animation plays while the AM/PM
  // regimen is generated. The animation gets a minimum on-screen time so
  // it never flashes; the regimen call is fail-soft (null → reveal with
  // recommendations only).
  useEffect(() => {
    if (state.screen !== 'formulating') return;
    let cancelled = false;
    const minDelay = new Promise((r) => setTimeout(r, 2800));
    const regimenPromise = state.result && state.refCode
      ? generateScanRegimen({
          ref_code: state.refCode,
          skin_concerns: state.result.skin_concerns,
          product_names: state.result.recommended_products.map((p) => p.name),
        })
      : Promise.resolve(null);
    Promise.all([regimenPromise, minDelay]).then(([regimen]) => {
      if (!cancelled) dispatch({ type: 'REVEAL_DONE', regimen: regimen ?? undefined });
    });
    return () => { cancelled = true; };
  }, [state.screen]);

  return (
    <Layout>
      {state.screen === 'intro' && (
        <IntroScreen
          config={state.config}
          configLoading={state.configLoading}
          configError={state.configError}
          onStart={() => dispatch({ type: 'START_SCAN' })}
        />
      )}
      {state.screen === 'capture' && (
        <CaptureScreen
          onPhotoReady={(b64, sides, consent) => dispatch({ type: 'PHOTO_READY', photoBase64: b64, sideImages: sides, trainingConsent: consent })}
        />
      )}
      {state.screen === 'analyzing' && state.photoBase64 && state.refCode && (
        <AnalyzingScreen
          refCode={state.refCode}
          photoBase64={state.photoBase64}
          sideImages={state.sideImagesBase64 ?? undefined}
          productName={state.productName}
          sessionId={state.sessionId}
          deviceType={state.deviceType}
          trainingConsent={state.trainingConsent}
          onResult={handleResult}
          onError={handleAnalyzeError}
        />
      )}
      {state.screen === 'result' && state.refCode && (
        <ResultScreen
          result={state.result}
          error={state.analyzeError}
          photoBase64={state.photoBase64}
          configProducts={state.config?.products || []}
          cart={state.cart}
          revealed={state.revealed}
          onReveal={() => dispatch({ type: 'REVEAL_START' })}
          onCartAdd={(id) => dispatch({ type: 'CART_ADD', productId: id })}
          onCartSet={(id, qty) => dispatch({ type: 'CART_SET', productId: id, quantity: qty })}
          onCheckout={() => dispatch({ type: 'START_BUNDLE_ORDER' })}
          onScanAgain={() => dispatch({ type: 'SCAN_AGAIN' })}
        />
      )}
      {state.screen === 'formulating' && <FormulationAnimation />}
      {state.screen === 'bundle_order' && state.result && state.config?.brand && state.refCode && (
        <BundleOrderScreen
          products={state.result.recommended_products.filter((p) => p.id && state.cart[p.id])}
          initialQuantities={state.cart}
          brandId={state.config.brand.id}
          refCode={state.refCode}
          cmp={state.cmp}
          sessionId={state.sessionId}
          deviceType={state.deviceType}
          error={state.orderError}
          onSuccess={(orderRef) => dispatch({ type: 'ORDER_SUCCESS', orderRef })}
          onError={(error) => dispatch({ type: 'ORDER_ERROR', error })}
          onBack={() => dispatch({ type: 'BACK_TO_RESULT' })}
        />
      )}
      {state.screen === 'order_success' && (
        <OrderSuccessScreen
          orderRef={state.orderRef}
          onScanAgain={() => dispatch({ type: 'SCAN_AGAIN' })}
        />
      )}
    </Layout>
  );
}
