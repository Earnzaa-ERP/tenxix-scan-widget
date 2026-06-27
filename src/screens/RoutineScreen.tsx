import { useEffect, useState } from 'react';
import type { Regimen, RegimenStep, ScanResult } from '../types';
import { generateScanRegimen } from '../api';
import { FormulationAnimation } from '../components/FormulationAnimation';
import { formatNaira } from '../lib/format';

interface RoutineScreenProps {
  result: ScanResult;
  refCode: string;
  onOrder: () => void;
  onScanAgain: () => void;
}

const MIN_BUILD_MS = 2600; // keep the formulation animation up at least this long

function StepCard({ step, index }: { step: RegimenStep; index: number }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 shrink-0 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        {step.type && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary)]/70">{step.type}</span>
        )}
        {step.product.price != null && (
          <span className="ml-auto text-[var(--color-primary)] font-bold text-sm">{formatNaira(step.product.price)}</span>
        )}
      </div>
      {step.product.name && (
        <h4 className="font-semibold text-[var(--color-primary)] text-sm leading-snug">{step.product.name}</h4>
      )}
      {step.instruction && <p className="text-xs text-gray-600 leading-relaxed">{step.instruction}</p>}
      {step.why && <p className="text-xs text-gray-400 italic leading-relaxed">{step.why}</p>}
      {step.key_ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {step.key_ingredients.map((ing) => (
            <span key={ing} className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">{ing}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, emoji, steps }: { title: string; emoji: string; steps: RegimenStep[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--color-primary)] flex items-center gap-1.5">
        <span>{emoji}</span> {title}
      </h3>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <StepCard key={`${title}-${i}`} step={s} index={i} />
        ))}
      </div>
    </div>
  );
}

export function RoutineScreen({ result, refCode, onOrder, onScanAgain }: RoutineScreenProps) {
  const [phase, setPhase] = useState<'building' | 'ready' | 'failed'>('building');
  const [regimen, setRegimen] = useState<Regimen | null>(null);

  useEffect(() => {
    let cancelled = false;
    let built: Regimen | null = null;
    let minDone = false;
    let fetchDone = false;

    const settle = () => {
      if (cancelled || !minDone || !fetchDone) return;
      if (built) {
        setRegimen(built);
        setPhase('ready');
      } else {
        setPhase('failed');
      }
    };

    const timer = setTimeout(() => {
      minDone = true;
      settle();
    }, MIN_BUILD_MS);

    generateScanRegimen({
      ref_code: refCode,
      skin_concerns: result.skin_concerns,
      product_names: result.recommended_products.map((p) => p.name).filter(Boolean),
      product_name: result.current_product?.name ?? undefined,
    })
      .then((r) => {
        built = r;
      })
      .catch(() => {
        built = null;
      })
      .finally(() => {
        fetchDone = true;
        settle();
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [result, refCode]);

  if (phase === 'building') return <FormulationAnimation />;

  // Fallback if the routine couldn't be built — still let them order/retry.
  if (phase === 'failed' || !regimen) {
    return (
      <div className="flex-1 flex flex-col px-5 py-6 gap-5 overflow-y-auto">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[var(--color-primary)]">Your Recommended Products</h2>
          <p className="text-sm text-gray-500">We couldn’t build the full routine just now, but here’s what your skin needs.</p>
        </div>
        <div className="space-y-2">
          {result.recommended_products.map((p, i) => (
            <div key={p.id ?? i} className="flex justify-between items-center border border-gray-200 rounded-xl p-3">
              <span className="text-sm font-medium text-[var(--color-primary)]">{p.name}</span>
              {p.price != null && <span className="text-sm text-gray-600">{formatNaira(p.price)}</span>}
            </div>
          ))}
        </div>
        {result.recommended_products.length >= 1 && (
          <button
            onClick={onOrder}
            className="w-full py-3.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Order These Products →
          </button>
        )}
        <button onClick={onScanAgain} className="text-center text-gray-400 text-sm underline py-1">Scan Again</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-5 py-6 gap-5 overflow-y-auto">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-[var(--color-primary)]">Your Personalized Routine</h2>
        <p className="text-sm text-gray-500">Built from your scan — follow it morning and night.</p>
      </div>

      <Section title="Morning" emoji="☀️" steps={regimen.morning} />
      <Section title="Evening" emoji="🌙" steps={regimen.evening} />

      {regimen.tips.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pro Tips</h3>
          {regimen.tips.map((tip, i) => (
            <p key={i} className="text-xs text-gray-600 leading-relaxed">💡 {tip}</p>
          ))}
        </div>
      )}

      <button
        onClick={onOrder}
        className="w-full py-3.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
      >
        Order Your Routine →
      </button>

      <button onClick={onScanAgain} className="text-center text-gray-400 text-sm underline py-1">Scan Again</button>
    </div>
  );
}
