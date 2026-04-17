import { useState } from 'react';
import type { ScanResult, ConfigProduct, RecommendedProduct } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ConcernTag } from '../components/ConcernTag';
import { ErrorBanner } from '../components/ErrorBanner';

interface ResultScreenProps {
  result: ScanResult | null;
  error: string | null;
  refCode: string;
  photoBase64: string | null;
  configProducts: ConfigProduct[];
  onScanAgain: () => void;
  onBundleOrder: () => void;
}

export function ResultScreen({ result, error, refCode, photoBase64, configProducts, onScanAgain, onBundleOrder }: ResultScreenProps) {
  const [detailProduct, setDetailProduct] = useState<RecommendedProduct | null>(null);

  // Look up full product details from config by ID
  function getProductDetail(productId: string | null): ConfigProduct | null {
    if (!productId) return null;
    return configProducts.find(p => p.id === productId) || null;
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
      {/* Scan photo + headline */}
      <div className="flex gap-4 items-start">
        {photoBase64 && (
          <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-[var(--color-accent)]/20">
            <img
              src={`data:image/jpeg;base64,${photoBase64}`}
              alt="Your skin scan"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="space-y-2 flex-1 min-w-0">
          <h2 className="text-lg font-bold text-[var(--color-primary)] leading-tight">
            {result.headline}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">{result.explanation}</p>
        </div>
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
          Recommended For You
        </h3>
        <div className="space-y-3">
          {result.recommended_products.map((product, i) => (
            <ProductCard
              key={product.id ?? i}
              product={product}
              refCode={refCode}
              onKnowMore={() => setDetailProduct(product)}
            />
          ))}
        </div>
      </div>

      {/* Bundle CTA */}
      {result.recommended_products.length > 1 && (
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

      {/* Know More Modal */}
      {detailProduct && (
        <ProductDetailModal
          recommended={detailProduct}
          detail={getProductDetail(detailProduct.id)}
          refCode={refCode}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </div>
  );
}
