import type { Regimen, RegimenStep } from '../types';

// AM/PM routine display — rendered on the result screen once the regimen
// call returns (general mode). Kept read-only and compact: the shopping
// action stays with the product cards above.

const stepBadge: Record<string, string> = {
  CLEANSE: 'bg-sky-50 text-sky-700 border-sky-200',
  TREAT: 'bg-purple-50 text-purple-700 border-purple-200',
  MOISTURIZE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PROTECT: 'bg-amber-50 text-amber-700 border-amber-200',
};

function StepRow({ step, index }: { step: RegimenStep; index: number }) {
  const badge = stepBadge[step.type] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </div>
      <div className="min-w-0 space-y-0.5 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-[var(--color-primary)]">{step.product.name}</span>
          {step.type && (
            <span className={`text-[10px] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 ${badge}`}>
              {step.type}
            </span>
          )}
        </div>
        {step.instruction && <p className="text-xs text-gray-600 leading-relaxed">{step.instruction}</p>}
        {step.why && <p className="text-[11px] text-gray-400 leading-relaxed">{step.why}</p>}
      </div>
    </div>
  );
}

export function RegimenSection({ regimen }: { regimen: Regimen }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Daily Routine</h3>

      {regimen.morning.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-3">☀️ Morning</p>
          {regimen.morning.map((step, i) => (
            <StepRow key={`am-${i}`} step={step} index={i} />
          ))}
        </div>
      )}

      {regimen.evening.length > 0 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 mb-3">🌙 Evening</p>
          {regimen.evening.map((step, i) => (
            <StepRow key={`pm-${i}`} step={step} index={i} />
          ))}
        </div>
      )}

      {regimen.tips.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Tips</p>
          {regimen.tips.map((tip, i) => (
            <p key={i} className="text-xs text-gray-600 leading-relaxed">• {tip}</p>
          ))}
        </div>
      )}
    </div>
  );
}
