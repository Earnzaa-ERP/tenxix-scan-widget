import { useCallback, useEffect, useReducer } from 'react';
import type { AppState, AppAction, ScanResult } from './types';
import { fetchWidgetConfig } from './api';
import { generateSessionId, detectDeviceType } from './lib/session';
import { Layout } from './components/Layout';
import { IntroScreen } from './screens/IntroScreen';
import { CaptureScreen } from './screens/CaptureScreen';
import { AnalyzingScreen } from './screens/AnalyzingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { BundleOrderScreen } from './screens/BundleOrderScreen';
import { OrderSuccessScreen } from './screens/OrderSuccessScreen';

const params = new URLSearchParams(window.location.search);
const refCode = params.get('ref');
const productName = params.get('product');

const initialState: AppState = {
  screen: 'intro',
  refCode,
  productName,
  config: null,
  configLoading: !!refCode,
  configError: refCode ? null : 'This scan link is invalid. Please use the link provided by your skincare consultant.',
  photoBase64: null,
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
        ? { ...state, screen: 'analyzing', photoBase64: action.photoBase64, result: null, analyzeError: null }
        : state;
    case 'ANALYZE_SUCCESS':
      return state.screen === 'analyzing' ? { ...state, screen: 'result', result: action.result } : state;
    case 'ANALYZE_ERROR':
      return state.screen === 'analyzing' ? { ...state, screen: 'result', analyzeError: action.error } : state;
    case 'SCAN_AGAIN':
      return { ...state, screen: 'capture', photoBase64: null, result: null, analyzeError: null, orderRef: null, orderError: null };
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

export default function App() {
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
        <CaptureScreen onPhotoReady={(b64) => dispatch({ type: 'PHOTO_READY', photoBase64: b64 })} />
      )}
      {state.screen === 'analyzing' && state.photoBase64 && state.refCode && (
        <AnalyzingScreen
          refCode={state.refCode}
          photoBase64={state.photoBase64}
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
          onScanAgain={() => dispatch({ type: 'SCAN_AGAIN' })}
          onBundleOrder={() => dispatch({ type: 'START_BUNDLE_ORDER' })}
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
