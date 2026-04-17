import type { ConfigProduct, RecommendedProduct } from '../types';
import { formatNaira } from '../lib/format';

interface ProductDetailModalProps {
  recommended: RecommendedProduct;
  detail: ConfigProduct | null;
  refCode: string;
  onClose: () => void;
}

function buildRedirectUrl(baseUrl: string, refCode: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}ref=${encodeURIComponent(refCode)}`;
}

export function ProductDetailModal({ recommended, detail, refCode, onClose }: ProductDetailModalProps) {
  const hasRedirect = !!recommended.redirect_url;

  function handleBuy() {
    if (!recommended.redirect_url) return;
    const url = buildRedirectUrl(recommended.redirect_url, refCode);
    if (window.top) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-[440px] max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-base text-[var(--color-primary)]">{recommended.name}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Price */}
          {recommended.price != null && (
            <p className="text-[var(--color-accent)] font-bold text-xl">{formatNaira(recommended.price)}</p>
          )}

          {/* Why it matches — AI personalized */}
          {recommended.why_it_matches && (
            <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <h3 className="text-xs font-bold text-violet-700 uppercase tracking-wide">Why This is Right For You</h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{recommended.why_it_matches}</p>
            </div>
          )}

          {/* Full description */}
          {detail?.full_description && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">About This Product</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{detail.full_description}</p>
            </div>
          )}

          {/* Ingredients */}
          {detail?.ingredients && detail.ingredients.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Key Ingredients</h3>
              <div className="space-y-2">
                {detail.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] mt-1.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-sm text-[var(--color-primary)]">{ing.name}</span>
                      {ing.explanation && (
                        <span className="text-sm text-gray-500"> — {ing.explanation}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testimonials */}
          {detail?.testimonials && detail.testimonials.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Real Results</h3>
              {detail.testimonials.map((test, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  {/* Before/After images */}
                  {test.media_type === 'before_after' && test.before_url && test.after_url && (
                    <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                      <div className="relative">
                        <img src={test.before_url} alt="Before" className="w-full aspect-square object-cover" />
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Before</span>
                      </div>
                      <div className="relative">
                        <img src={test.after_url} alt="After" className="w-full aspect-square object-cover" />
                        <span className="absolute bottom-1 left-1 bg-[var(--color-accent)]/80 text-white text-[10px] px-1.5 py-0.5 rounded">After</span>
                      </div>
                    </div>
                  )}

                  {/* Video */}
                  {test.media_type === 'video' && test.video_url && (
                    <video src={test.video_url} controls className="w-full rounded-lg" />
                  )}

                  {/* Quote */}
                  <p className="text-sm text-gray-600 italic leading-relaxed">"{test.text}"</p>

                  {/* Attribution */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-primary)]">{test.name}</p>
                      {test.location && <p className="text-xs text-gray-400">{test.location}</p>}
                    </div>
                    {test.result && (
                      <span className="text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-1 rounded-full">
                        {test.result}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="sticky bottom-0 bg-white pt-3 pb-2">
            {hasRedirect ? (
              <button
                onClick={handleBuy}
                className="w-full py-3.5 bg-[var(--color-accent)] text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                Get Yours Now &rarr;
              </button>
            ) : (
              <p className="text-center text-gray-400 text-sm py-2">Coming Soon</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
