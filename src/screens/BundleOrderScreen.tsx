import { useState } from 'react';
import type { RecommendedProduct } from '../types';
import { submitBundleOrder } from '../api';
import { formatNaira } from '../lib/format';
import { ErrorBanner } from '../components/ErrorBanner';
import { NIGERIAN_STATES } from '../constants';

interface BundleOrderScreenProps {
  products: RecommendedProduct[];
  brandId: string;
  refCode: string;
  sessionId: string;
  deviceType: string;
  error: string | null;
  onSuccess: (orderRef: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export function BundleOrderScreen({
  products,
  brandId,
  refCode,
  sessionId,
  deviceType,
  error,
  onSuccess,
  onError,
  onBack,
}: BundleOrderScreenProps) {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    alt_phone: '',
    state: '',
    city: '',
    address: '',
    landmark: '',
    address_type: 'home' as 'home' | 'office',
  });
  const [submitting, setSubmitting] = useState(false);

  const total = products.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const productIds = products.map((p) => p.id).filter(Boolean) as string[];

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.full_name.trim() || !form.phone.trim() || !form.state) {
      onError('Please fill in your name, phone number, and state.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitBundleOrder({
        ref_code: refCode,
        brand_id: brandId,
        product_ids: productIds,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        alt_phone: form.alt_phone.trim() || undefined,
        state: form.state,
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined,
        landmark: form.landmark.trim() || undefined,
        address_type: form.address_type,
        session_id: sessionId,
        device_type: deviceType,
      });
      onSuccess(res.order_ref);
    } catch (err: any) {
      onError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-[var(--color-primary)]">Complete Your Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
        {error && <ErrorBanner message={error} />}

        {/* Order summary */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Package</h3>
          {products.map((p, i) => (
            <div key={p.id ?? i} className="flex justify-between items-center text-sm">
              <span className="text-gray-700">{p.name}</span>
              <span className="font-medium text-[var(--color-primary)]">
                {p.price != null ? formatNaira(p.price) : '—'}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
            <span className="font-semibold text-sm text-[var(--color-primary)]">Total</span>
            <span className="font-bold text-base text-[var(--color-accent)]">{formatNaira(total)}</span>
          </div>
        </div>

        {/* Customer details */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Details</h3>

          <input
            type="text"
            placeholder="Full Name *"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            maxLength={100}
            required
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
          />

          <input
            type="tel"
            placeholder="Phone Number *"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            maxLength={15}
            required
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
          />

          <input
            type="tel"
            placeholder="WhatsApp Number (optional)"
            value={form.alt_phone}
            onChange={(e) => update('alt_phone', e.target.value)}
            maxLength={15}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
          />

          <select
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] bg-white"
          >
            <option value="">Select State *</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="City"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            maxLength={50}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
          />

          <textarea
            placeholder="Delivery Address"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] resize-none"
          />

          <input
            type="text"
            placeholder="Landmark (optional)"
            value={form.landmark}
            onChange={(e) => update('landmark', e.target.value)}
            maxLength={255}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
          />

          {/* Address type */}
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="address_type"
                value="home"
                checked={form.address_type === 'home'}
                onChange={() => update('address_type', 'home')}
                className="accent-[var(--color-accent)]"
              />
              Home
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="address_type"
                value="office"
                checked={form.address_type === 'office'}
                onChange={() => update('address_type', 'office')}
                className="accent-[var(--color-accent)]"
              />
              Office
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-[var(--color-accent)] text-white rounded-xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {submitting ? 'Placing Order...' : `Place Order \u2014 ${formatNaira(total)}`}
        </button>
      </form>
    </div>
  );
}
