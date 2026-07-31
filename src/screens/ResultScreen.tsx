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
  // Removing an ESSENTIAL from the cart prompts a warning first (like the app);
  // optional items are removed silently. `null` = no prompt showing.
  const [essentialToRemove, setEssentialToRemove] = useState<RecommendedProduct | null>(null);

  // Gate quantity changes: dropping an essential to 0 opens the confirm modal
  // instead of removing outright. Everything else passes straight through.
  function handleSetQty(product: RecommendedProduct, qty: number) {
    if (!product.id) return;
    if (qty <= 0 && product.importance === 'essential') {
      setEssentialToRemove(product);
      return;
    }
    onCartSet(product.id, qty);
  }

  // Fire the pixel ViewContent once, when a successful scan result is shown.
  const viewFired = useRef(false);
  useEffect(() => {
    if (result && !error && !viewFired.current) {
      viewFired.current = true;
      track('ViewContent', { content_type: 'product', currency: 'NGN' });
    }
  }, [result, error]);

  // After the reveal, snap the scroll back to the top so the recommendations
  // are the first thing seen — never buried under the analysis.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (revealed) scrollRef.current?.scrollTo({ top: 0 });
  }, [revealed]);

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

  // The analysis view — full app-parity report when the backend returns it,
  // otherwise the compact headline + concern-tags. Rendered expanded before
  // the reveal; collapsed into an accordion after, so it never buries the recs.
  const analysisBlock = result.report ? (
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
  );

  const productsBlock = (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Recommendations</h3>
        <span className="text-[11px] text-[var(--color-primary)] font-medium">Add 2+ for best results</span>
      </div>
      <div className="space-y-3">
        {products.map((product, i) => (
          <ProductCard
            key={product.id ?? i}
            product={product}
            quantity={qtyOf(product)}
            onAdd={() => product.id && onCartAdd(product.id)}
            onSetQty={(q) => handleSetQty(product, q)}
            onKnowMore={() => setDetailProduct(product)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-5 py-6 space-y-5 ${revealed ? 'pb-28' : ''}`}>
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

        {!revealed ? (
          /* Pre-reveal (general mode): the full analysis is the whole screen,
             so they read it first, then tap the floating CTA below. */
          analysisBlock
        ) : (
          <>
            {/* Post-reveal: lead with what they asked for. Recommendations come
                first so nobody has to scroll past the analysis to find them. */}
            {productsBlock}

            {/* AM/PM routine (general mode, arrives with the reveal) */}
            {result.regimen && <RegimenSection regimen={result.regimen} />}

            {/* Full analysis kept for the curious, but collapsed by default so
                it never buries the offer. */}
            <details className="group rounded-xl border border-gray-200 overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer select-none px-4 py-3 text-sm font-semibold text-[var(--color-primary)] list-none marker:hidden [&::-webkit-details-marker]:hidden">
                <span>See your full skin analysis</span>
                <svg className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-5 border-t border-gray-100">
                {analysisBlock}
              </div>
            </details>
          </>
        )}

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

      {/* Pre-reveal: the recommendations CTA sits in the flow at the bottom. */}
      {!revealed && (
        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-3">
          <button
            onClick={onReveal}
            className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg"
          >
            ✨ Get My Product Recommendations
          </button>
        </div>
      )}

      {/* Post-reveal: the running total + checkout floats over the content as a
          pill — always in reach, without pinning a full bar to the edge. The
          wrapper is click-through; only the pill itself is interactive. */}
      {revealed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
          {distinctInCart === 1 && (
            <div className="flex justify-center mb-2">
              <span className="pointer-events-auto text-[11px] font-medium text-[var(--color-primary)] bg-white/95 backdrop-blur px-3 py-1 rounded-full shadow-md border border-gray-100">
                ✨ Pair it with one more for complete results
              </span>
            </div>
          )}
          <button
            onClick={onCheckout}
            disabled={distinctInCart === 0}
            className="pointer-events-auto w-full flex items-center justify-between gap-3 pl-5 pr-3 py-3 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-[0_12px_32px_-8px_rgba(86,10,136,0.55)] active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100 disabled:shadow-none"
          >
            <span className="flex flex-col items-start leading-tight text-left">
              <span className="text-[11px] opacity-80">
                {totalUnits === 0 ? 'Your cart' : `${totalUnits} item${totalUnits === 1 ? '' : 's'}`}
              </span>
              <span className="font-bold text-lg leading-none">{formatNaira(total)}</span>
            </span>
            <span className="flex items-center gap-1 font-semibold text-sm bg-white/15 pl-4 pr-3 py-2 rounded-xl">
              Checkout
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </button>
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

      {/* Essential-removal warning — explains why the product matters before
          letting them take it out (mirrors the app). */}
      {essentialToRemove && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
          onClick={() => setEssentialToRemove(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)] bg-[var(--color-accent)]/20 px-2 py-0.5 rounded-full">
              Essential
            </span>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--color-primary)] leading-snug">
                Remove {essentialToRemove.name}?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                This one is essential to your results
                {essentialToRemove.why_it_matches ? ` — ${essentialToRemove.why_it_matches}` : '.'} Without it, the rest of your set can&rsquo;t fix the root cause, so your results will be slower and partial.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => setEssentialToRemove(null)}
                className="w-full py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                Keep it in my set
              </button>
              <button
                onClick={() => {
                  if (essentialToRemove.id) onCartSet(essentialToRemove.id, 0);
                  track('EssentialRemoved', {
                    content_ids: essentialToRemove.id ? [essentialToRemove.id] : [],
                    content_name: essentialToRemove.name,
                  });
                  setEssentialToRemove(null);
                }}
                className="w-full py-2.5 text-gray-400 text-sm font-medium active:scale-[0.98] transition-transform"
              >
                Remove anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
