import type { SkinReport, MetricKey, ReportConcern } from '../types';

// App-parity skin report (2026-07-18): the same result structure and
// voice as the Tenxix Mirror app — overall score, skin-type/Fitzpatrick
// chips, estimated age, seven scored metric bars with bands, summary,
// concerns with severity badges, and strengths — rendered in the
// widget's own visual language. Band thresholds live HERE (client-side)
// so both surfaces can share them: <50 red, 50-69 amber, 70-84 green,
// 85+ emerald.

const METRIC_META: { key: MetricKey; label: string; emoji: string }[] = [
  { key: 'hydration', label: 'Hydration', emoji: '💧' },
  { key: 'pigmentation', label: 'Pigmentation', emoji: '🎨' },
  { key: 'pores', label: 'Pores', emoji: '🔬' },
  { key: 'wrinkles', label: 'Wrinkles', emoji: '✨' },
  { key: 'elasticity', label: 'Elasticity', emoji: '💪' },
  { key: 'texture', label: 'Texture', emoji: '🌐' },
  { key: 'radiance', label: 'Radiance', emoji: '☀️' },
];

function bandOf(score: number): { label: string; text: string; bar: string } {
  if (score >= 85) return { label: 'Excellent', text: 'text-emerald-600', bar: 'bg-emerald-500' };
  if (score >= 70) return { label: 'Good', text: 'text-green-600', bar: 'bg-green-500' };
  if (score >= 50) return { label: 'Fair', text: 'text-amber-500', bar: 'bg-amber-400' };
  return { label: 'Needs care', text: 'text-red-500', bar: 'bg-red-400' };
}

const severityChip: Record<ReportConcern['severity'], { label: string; cls: string }> = {
  mild: { label: 'Mild', cls: 'bg-green-50 text-green-700 border-green-200' },
  moderate: { label: 'Moderate', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  significant: { label: 'Significant', cls: 'bg-red-50 text-red-600 border-red-200' },
};

function ScoreRing({ score }: { score: number }) {
  const band = bandOf(score);
  const r = 34;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 84 84" className="w-24 h-24 -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#f1f1f4" strokeWidth="8" />
        <circle
          cx="42" cy="42" r={r} fill="none"
          stroke="currentColor"
          className={band.text}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold leading-none ${band.text}`}>{score}</span>
        <span className="text-[10px] text-gray-400 mt-0.5">{band.label}</span>
      </div>
    </div>
  );
}

export function SkinReportSection({ report, photoBase64 }: { report: SkinReport; photoBase64: string | null }) {
  const chips: string[] = [];
  if (report.skin_type) chips.push(`${report.skin_type} Skin`);
  if (report.fitzpatrick) chips.push(`Fitzpatrick ${report.fitzpatrick}`);

  return (
    <div className="space-y-4">
      {/* Header: photo + overall score + chips */}
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent p-4">
        <div className="flex items-center gap-4">
          {photoBase64 && (
            <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--color-primary)]/30">
              <img src={`data:image/jpeg;base64,${photoBase64}`} alt="Your skin scan" className="w-full h-full object-cover" />
            </div>
          )}
          {report.overall_score !== null && <ScoreRing score={report.overall_score} />}
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Your Skin Report</p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span key={c} className="text-[11px] font-medium bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-700">
                  {c}
                </span>
              ))}
              {report.estimated_age !== null && (
                <span className="text-[11px] font-medium bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-700">
                  Est. Age: {report.estimated_age}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metric bars */}
      <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Skin Health Metrics</h3>
        {METRIC_META.map(({ key, label, emoji }) => {
          const score = report.metrics[key];
          if (score === null || score === undefined) return null;
          const band = bandOf(score);
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{emoji} {label}</span>
                <span className={`text-xs font-semibold ${band.text}`}>
                  {score} <span className="font-normal text-gray-400">{band.label}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${band.bar}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {report.summary && (
        <div className="rounded-2xl border border-gray-100 p-4 space-y-1.5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Summary</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
        </div>
      )}

      {/* Concerns with severity */}
      {report.concerns.length > 0 && (
        <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Concerns Identified</h3>
          {report.concerns.map((c) => (
            <div key={c.name} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-primary)]">{c.name}</p>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${severityChip[c.severity].cls}`}>
                  {severityChip[c.severity].label}
                </span>
              </div>
              {c.detail && <p className="text-xs text-gray-600 leading-relaxed">{c.detail}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {report.strengths.length > 0 && (
        <div className="rounded-2xl border border-gray-100 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Skin Strengths</h3>
          {report.strengths.map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-600 text-[10px] flex items-center justify-center mt-0.5">✓</span>
              <p className="text-xs text-gray-600 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
