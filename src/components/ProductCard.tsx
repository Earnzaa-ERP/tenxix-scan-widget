import type { RecommendedProduct } from '../types';
import { formatNaira } from '../lib/format';

interface ProductCardProps {
  product: RecommendedProduct;
  refCode: string;
  onKnowMore?: () => void;
}

function buildRedirectUrl(baseUrl: string, refCode: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}ref=${encodeURIComponent(refCode)}`;
}

export function ProductCard({ product, refCode, onKnowMore }: ProductCardProps) {
  const hasRedirect = !!product.redirect_url;

  function handleClick() {
    if (!product.redirect_url) return;
    const url = buildRedirectUrl(product.redirect_url, refCode);
    if (window.top) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-[var(--color-primary)] text-base">{product.name}</h3>
        {product.price != null && (
          <p className="text-[var(--color-accent)] font-bold text-lg mt-1">
            {formatNaira(product.price)}
          </p>
        )}
      </div>

      {/* Why it matches — short preview */}
      {product.why_it_matches && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{product.why_it_matches}</p>
      )}

      <div className="flex gap-2">
        {onKnowMore && (
          <button
            onClick={onKnowMore}
            className="flex-1 py-2.5 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Know More
          </button>
        )}
        {hasRedirect ? (
          <button
            onClick={handleClick}
            className="flex-1 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Get Yours Now &rarr;
          </button>
        ) : (
          <p className="flex-1 text-center text-gray-400 text-sm py-2">Coming Soon</p>
        )}
      </div>
    </div>
  );
}
