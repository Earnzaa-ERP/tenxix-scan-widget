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

  return (
    <div
      className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
        inCart ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.03]' : 'border-gray-200'
      }`}
    >
      <div>
        <h3 className="font-semibold text-[var(--color-primary)] text-base">{product.name}</h3>
        {product.price != null && (
          <p className="text-[var(--color-primary)] font-bold text-lg mt-1">{formatNaira(product.price)}</p>
        )}
      </div>

      {product.why_it_matches && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{product.why_it_matches}</p>
      )}

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
