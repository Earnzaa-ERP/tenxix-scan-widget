import { APP_DOWNLOAD_URL } from '../constants';

interface OrderSuccessScreenProps {
  orderRef: string | null;
  onScanAgain: () => void;
}

export function OrderSuccessScreen({ orderRef, onScanAgain }: OrderSuccessScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Confirmation */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">Order Confirmed!</h2>
        {orderRef && (
          <p className="text-sm text-gray-600">
            Your order reference is <span className="font-bold text-[var(--color-primary)]">{orderRef}</span>
          </p>
        )}
        <p className="text-sm text-gray-500">Our team will call you shortly to confirm your order.</p>
      </div>

      {/* App download CTA */}
      <div className="w-full max-w-[300px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-xl p-5 text-white space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-white/20 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
        </div>
        <h3 className="font-bold text-base">Download Tenxix Mirror</h3>
        <p className="text-xs text-white/80 leading-relaxed">
          Track your order, get personalized skin tips, and reorder easily.
        </p>
        <a
          href={APP_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2.5 bg-white text-[var(--color-primary)] rounded-lg font-semibold text-sm text-center active:scale-[0.98] transition-transform"
        >
          Download Now
        </a>
      </div>

      {/* Scan again */}
      <button
        onClick={onScanAgain}
        className="text-gray-400 text-sm underline py-2"
      >
        Scan Again
      </button>
    </div>
  );
}
