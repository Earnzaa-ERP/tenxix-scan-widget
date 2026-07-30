import type { RecommendedProduct } from '../types';
import { formatNaira } from '../lib/format';

interface ProductCardProps {
  product: RecommendedProduct;
  quantity: number; // 0 = not in cart
  onAdd: () => void;
  onSetQty: (qty: number) => void;
  onKnowMore?: () => void;
}

export function ProductCard({ product, quantity, onAdd, onSetQty, onKnowMore }: ProductCardProps) {
  const orderable = !!product.id && product.price != null;
  const inCart = quantity > 0;

  const isEssential = product.importance === 'essential';

  return (
    <div
      className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
        inCart ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.03]' : 'border-gray-200'
      }`}
    >
      <div className="flex gap-3">
        {/* Product image so they see exactly what they're buying */}
        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)]/30">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isEssential && (
            <span className="inline-block mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)] bg-[var(--color-accent)]/20 px-2 py-0.5 rounded-full">
              Essential
            </span>
          )}
          <h3 className="font-semibold text-[var(--color-primary)] text-base leading-tight">{product.name}</h3>
          {product.price != null && (
            <p className="text-[var(--color-primary)] font-bold text-lg mt-0.5">{formatNaira(product.price)}</p>
          )}
          {product.why_it_matches && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-1">{product.why_it_matches}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        {onKnowMore && (
          <button
            onClick={onKnowMore}
            className="flex-1 py-2.5 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Know More
          </button>
        )}

        {!orderable ? (
          <p className="flex-1 text-center text-gray-400 text-sm py-2">Unavailable</p>
        ) : inCart ? (
          <div className="flex-1 flex items-center justify-center gap-2">
            <button
              onClick={() => onSetQty(quantity - 1)}
              aria-label="Decrease quantity"
              className="w-9 h-9 rounded-lg border border-gray-300 text-gray-600 flex items-center justify-center leading-none text-lg active:scale-95"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold text-[var(--color-primary)]">{quantity}</span>
            <button
              onClick={() => onSetQty(quantity + 1)}
              disabled={quantity >= 10}
              aria-label="Increase quantity"
              className="w-9 h-9 rounded-lg border border-gray-300 text-gray-600 flex items-center justify-center leading-none text-lg active:scale-95 disabled:opacity-30"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
