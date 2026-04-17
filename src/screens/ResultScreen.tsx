import type { ScanResult } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ConcernTag } from '../components/ConcernTag';
import { ErrorBanner } from '../components/ErrorBanner';

interface ResultScreenProps {
  result: ScanResult | null;
  error: string | null;
  refCode: string;
  onScanAgain: () => void;
  onBundleOrder: () => void;
}

export function ResultScreen({ result, error, refCode, onScanAgain, onBundleOrder }: ResultScreenProps) {
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
            className="px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Success state
  return (
    <div className="flex-1 flex flex-col px-5 py-6 gap-5 overflow-y-auto">
      {/* Headline */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-[var(--color-primary)] leading-tight">
          {result.headline}
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">{result.explanation}</p>
      </div>

      {/* Skin concerns */}
      {result.skin_concerns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.skin_concerns.map((concern) => (
            <ConcernTag key={concern} label={concern} />
          ))}
        </div>
      )}

      {/* Recommended products */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {result.recommended_products.length > 1 ? 'Recommended For You' : 'Recommended For You'}
        </h3>
        <div className="space-y-3">
          {result.recommended_products.map((product, i) => (
            <ProductCard key={product.id ?? i} product={product} refCode={refCode} />
          ))}
        </div>
      </div>

      {/* Bundle CTA */}
      {result.outcome === 'combo' && result.recommended_products.length > 1 && (
        <button
          onClick={onBundleOrder}
          className="w-full py-3.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
        >
          Get the Complete Package &rarr;
        </button>
      )}

      {/* Scan again */}
      <button
        onClick={onScanAgain}
        className="text-center text-gray-400 text-sm underline py-2"
      >
        Scan Again
      </button>
    </div>
  );
}
