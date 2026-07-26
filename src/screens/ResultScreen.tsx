import { useEffect, useRef, useState } from 'react';
import type { ScanResult, ConfigProduct, RecommendedProduct } from '../types';
import { track } from '../lib/bridge';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ConcernTag } from '../components/ConcernTag';
import { ErrorBanner } from '../components/ErrorBanner';
import { RegimenSection } from '../components/RegimenSection';
import { SkinReportSection } from '../components/SkinReportSection';
import { formatNaira } from '../lib/format';

interface ResultScreenProps {
  result: ScanResult | null;
  error: string | null;
  photoBase64: string | null;
  configProducts: ConfigProduct[];
  cart: Record<string, number>;
  /** General mode shows the analysis first (revealed=false) with a
   *  floating CTA; tapping it plays the formulation animation and then
   *  re-enters this screen with revealed=true. Product mode is always
   *  revealed. */
  revealed: boolean;
  onReveal: () => void;
  onCartAdd: (productId: string) => void;
  onCartSet: (productId: string, qty: number) => void;
  onCheckout: () => void;
  onScanAgain: () => void;
}

const fitStyle = {
  great: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Great fit for your skin' },
  partial: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Partly right for you' },
  poor: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Not the best fit for you' },
} as const;

export function ResultScreen({
  result,
  error,
  photoBase64,
  configProducts,
  cart,
  revealed,
  onReveal,
  onCartAdd,
  onCartSet,
  onCheckout,
  onScanAgain,
}: ResultScreenProps) {
  const [detailProduct, setDetailProduct] = useState<RecommendedProduct | null>(null);

  // Fire the pixel ViewContent once, when a successful scan result is shown.
  const viewFired = useRef(false);
  useEffect(() => {
    if (result && !error && !viewFired.current) {
      viewFired.current = true;
      track('ViewContent', { content_type: 'product', currency: 'NGN' });
    }
  }, [result, error]);

  function getProductDetail(productId: string | null): ConfigProduct | null {
    if (!productId) return null;
    return configProducts.find((p) => p.id === productId) || null;
  }

  // Error state
  if (error || !result) {
    const isRateLimit = error?.includes('scan limit');
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <ErrorBanner message={error || 'Something went wrong.'} />
        {!isRateLimit && (
          <button
            onClick={onScanAgain}
            className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  const verdict = result.current_product;
  const products = result.recommended_products;

  // Cart math
  const qtyOf = (p: RecommendedProduct) => (p.id ? cart[p.id] ?? 0 : 0);
  const distinctInCart = products.filter((p) => qtyOf(p) > 0).length;
  const totalUnits = products.reduce((s, p) => s + qtyOf(p), 0);
  const total = products.reduce((s, p) => s + (p.price ?? 0) * qtyOf(p), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {/* Headline finding — the root-cause insight, first thing they read */}
        {result.headline_finding && (
          <div className="rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] p-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-accent)] mb-1.5">
              Headline finding
            </p>
            <p className="text-[15px] font-semibold leading-snug">{result.headline_finding}</p>
          </div>
        )}

        {/* Verdict on the product they were viewing */}
        {verdict && (
          <div className={`rounded-xl border ${fitStyle[verdict.fit].border} ${fitStyle[verdict.fit].bg} p-4 space-y-1.5`}>
            <span className={`text-xs font-bold uppercase tracking-wide ${fitStyle[verdict.fit].text}`}>
              {verdict.fit === 'great' ? '✓ ' : verdict.fit === 'poor' ? '✕ ' : '~ '}
              {fitStyle[verdict.fit].label}
            </span>
            <h3 className="font-bold text-sm text-[var(--color-primary)]">{verdict.name}</h3>
            {verdict.reason && <p className="text-sm text-gray-700 leading-relaxed">{verdict.reason}</p>}
          </div>
        )}

        {/* Full app-parity report when the backend returns it; otherwise
            the original compact headline + concern-tags view. */}
        {result.report ? (
          <SkinReportSection report={result.report} photoBase64={photoBase64} />
        ) : (
          <>
            {/* Scan photo + headline */}
            <div className="flex gap-4 items-start">
              {photoBase64 && (
                <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-[var(--color-primary)]/20">
                  <img src={`data:image/jpeg;base64,${photoBase64}`} alt="Your skin scan" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="space-y-2 flex-1 min-w-0">
                <h2 className="text-lg font-bold text-[var(--color-primary)] leading-tight">{result.headline}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{result.explanation}</p>
              </div>
            </div>

            {/* Concerns */}
            {result.skin_concerns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.skin_concerns.map((concern) => (
                  <ConcernTag key={concern} label={concern} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Recommended products — hidden pre-reveal in general mode */}
        {revealed && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Build Your Set</h3>
              <span className="text-[11px] text-[var(--color-primary)] font-medium">Add 2+ for best results</span>
            </div>
            <div className="space-y-3">
              {products.map((product, i) => (
                <ProductCard
                  key={product.id ?? i}
                  product={product}
                  quantity={qtyOf(product)}
                  onAdd={() => product.id && onCartAdd(product.id)}
                  onSetQty={(q) => product.id && onCartSet(product.id, q)}
                  onKnowMore={() => setDetailProduct(product)}
                />
              ))}
            </div>
          </div>
        )}

        {/* AM/PM routine (general mode, arrives with the reveal) */}
        {revealed && result.regimen && <RegimenSection regimen={result.regimen} />}

        {/* Training-consent receipt: the guest's deletion handle. Only present
            when they ticked the consent checkbox on capture. */}
        {result.scan_ref && (
          <p className="text-[11px] text-gray-400 text-center leading-relaxed px-4">
            Scan ID: <span className="font-mono font-medium text-gray-500">{result.scan_ref}</span>
            {' '}&middot; To remove your scan from Kira&rsquo;s training data, email{' '}
            <a href={`mailto:support@kirascan.app?subject=Remove%20scan%20${result.scan_ref}`} className="underline">
              support@kirascan.app
            </a>{' '}
            with this ID.
          </p>
        )}

        <button onClick={onScanAgain} className="w-full text-center text-gray-400 text-sm underline py-1">
          Scan Again
        </button>
      </div>

      {/* Bottom bar: pre-reveal it's the floating recommendations CTA —
          always on screen, no scrolling needed. Post-reveal it's the
          running total + checkout. */}
      {!revealed ? (
        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-3">
          <button
            onClick={onReveal}
            className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg"
          >
            ✨ Get My Product Recommendations
          </button>
        </div>
      ) : (
        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-3 space-y-2">
          {distinctInCart === 1 && (
            <p className="text-xs text-[var(--color-primary)] text-center font-medium">
              ✨ Pair it with one more for complete results
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400">
                {totalUnits === 0 ? 'Your cart' : `${totalUnits} item${totalUnits === 1 ? '' : 's'}`}
              </p>
              <p className="font-bold text-[var(--color-primary)] text-lg leading-none">{formatNaira(total)}</p>
            </div>
            <button
              onClick={onCheckout}
              disabled={distinctInCart === 0}
              className="px-6 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100"
            >
              Checkout →
            </button>
          </div>
        </div>
      )}

      {detailProduct && (
        <ProductDetailModal
          recommended={detailProduct}
          detail={getProductDetail(detailProduct.id)}
          inCart={detailProduct.id ? (cart[detailProduct.id] ?? 0) > 0 : false}
          onAddToCart={() => detailProduct.id && onCartAdd(detailProduct.id)}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </div>
  );
}
