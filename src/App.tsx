import { useCallback, useEffect, useReducer } from 'react';
import type { AppState, AppAction, ScanResult } from './types';
import { fetchWidgetConfig } from './api';
import { generateSessionId, detectDeviceType } from './lib/session';
import { Layout } from './components/Layout';
import { AnalyzingAnimation } from './components/AnalyzingAnimation';
import { FormulationAnimation } from './components/FormulationAnimation';
import { IntroScreen } from './screens/IntroScreen';
import { CaptureScreen } from './screens/CaptureScreen';
import { AnalyzingScreen } from './screens/AnalyzingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { RoutineScreen } from './screens/RoutineScreen';
import { BundleOrderScreen } from './screens/BundleOrderScreen';
import { OrderSuccessScreen } from './screens/OrderSuccessScreen';

const params = new URLSearchParams(window.location.search);
const refCode = params.get('ref') || 'direct';
const productName = params.get('product');

const initialState: AppState = {
  screen: 'intro',
  refCode,
  productName,
  config: null,
  configLoading: true,
  configError: null,
  photoBase64: null,
  sideImagesBase64: null,
  result: null,
  analyzeError: null,
  orderRef: null,
  orderError: null,
  sessionId: generateSessionId(),
  deviceType: detectDeviceType(),
};

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
        ? { ...state, screen: 'analyzing', photoBase64: action.photoBase64, sideImagesBase64: action.sideImages ?? null, result: null, analyzeError: null }
        : state;
    case 'ANALYZE_SUCCESS':
      return state.screen === 'analyzing' ? { ...state, screen: 'result', result: action.result } : state;
    case 'ANALYZE_ERROR':
      return state.screen === 'analyzing' ? { ...state, screen: 'result', analyzeError: action.error } : state;
    case 'SCAN_AGAIN':
      return { ...state, screen: 'capture', photoBase64: null, sideImagesBase64: null, result: null, analyzeError: null, orderRef: null, orderError: null };
    case 'VIEW_ROUTINE':
      return state.screen === 'result' ? { ...state, screen: 'routine' } : state;
    case 'START_BUNDLE_ORDER':
      return state.screen === 'result' || state.screen === 'routine'
        ? { ...state, screen: 'bundle_order', orderError: null }
        : state;
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
          onPhotoReady={(b64, sides) => dispatch({ type: 'PHOTO_READY', photoBase64: b64, sideImages: sides })}
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
          onResult={handleResult}
          onError={handleAnalyzeError}
        />
      )}
      {state.screen === 'result' && state.refCode && (
        <ResultScreen
          result={state.result}
          error={state.analyzeError}
          refCode={state.refCode}
          photoBase64={state.photoBase64}
          configProducts={state.config?.products || []}
          hasRoutine={(state.result?.recommended_products?.length ?? 0) > 0}
          onScanAgain={() => dispatch({ type: 'SCAN_AGAIN' })}
          onViewRoutine={() => dispatch({ type: 'VIEW_ROUTINE' })}
          onBundleOrder={() => dispatch({ type: 'START_BUNDLE_ORDER' })}
        />
      )}
      {state.screen === 'routine' && state.result && state.refCode && (
        <RoutineScreen
          result={state.result}
          refCode={state.refCode}
          onOrder={() => dispatch({ type: 'START_BUNDLE_ORDER' })}
          onScanAgain={() => dispatch({ type: 'SCAN_AGAIN' })}
        />
      )}
      {state.screen === 'bundle_order' && state.result && state.config?.brand && state.refCode && (
        <BundleOrderScreen
          products={state.result.recommended_products}
          brandId={state.config.brand.id}
          refCode={state.refCode}
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
