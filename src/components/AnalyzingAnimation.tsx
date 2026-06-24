import { useEffect, useState } from 'react';

// Mirrors the app's AnalysingScreen: the customer's own scan photo in a circle
// with a lime grid overlay, a sweeping scan line, concern markers, cycling
// phase text, progress dots, and a live "biomarker" ticker — on a dark purple
// gradient. Phase text + progress are driven in JS; everything else is CSS.

const PHASES = [
  'Reading your scan',
  'Mapping concern zones',
  'Checking pigmentation patterns',
  'Calibrating to your Fitzpatrick type',
  'Formulating your routine',
];

const TICKER_LINES = [
  ['HYDRATION', '67 → 71 → 73'],
  ['EVEN TONE', '58 → 61 → 64'],
  ['TEXTURE', '62 → 65 → 67'],
  ['RADIANCE', '71 → 74 → 76'],
  ['ELASTICITY', '69 → 71 → 72'],
];

// Concern markers as % positions over the face circle (matches the app cluster).
const MARKERS = [
  { x: 34, y: 32, delay: 1.2 },
  { x: 62, y: 38, delay: 2.4 },
  { x: 42, y: 58, delay: 3.6 },
  { x: 58, y: 52, delay: 4.8 },
];

const FACE_SIZE = 240; // px

interface AnalyzingAnimationProps {
  photoBase64: string | null;
}

export function AnalyzingAnimation({ photoBase64 }: AnalyzingAnimationProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Advance through phases, holding on the last one until the result lands.
    const id = setInterval(() => {
      setPhase((p) => (p < PHASES.length - 1 ? p + 1 : p));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-7 px-6 py-8 w-full"
      style={{ background: 'radial-gradient(120% 80% at 50% 0%, #1A0235 0%, #0A0410 70%)' }}
    >
      {/* Face + scan overlays */}
      <div
        className="relative shrink-0"
        style={{ width: FACE_SIZE, height: FACE_SIZE }}
      >
        {/* Corner brackets */}
        {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
          'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c) => (
          <span
            key={c}
            className={`absolute w-6 h-6 rounded-[3px] ${c}`}
            style={{ borderColor: 'rgba(141,253,0,0.7)' }}
          />
        ))}

        {/* Circular face with overlays clipped inside */}
        <div
          className="absolute inset-2 rounded-full overflow-hidden"
          style={{ border: '2px solid rgba(141,253,0,0.4)', boxShadow: '0 0 40px rgba(141,253,0,0.12)' }}
        >
          {photoBase64 ? (
            <img
              src={`data:image/jpeg;base64,${photoBase64}`}
              alt="Your scan"
              className="w-full h-full object-cover kira-anim-breathe"
              style={{ animation: 'kira-breathe 3.6s ease-in-out infinite' }}
            />
          ) : (
            <div className="w-full h-full" style={{ background: '#2A0A45' }} />
          )}

          {/* Faint lime grid */}
          <div
            className="absolute inset-0 kira-anim-grid"
            style={{
              animation: 'kira-fade-in 0.8s ease-out 0.4s both',
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent 0 calc(11.11% - 1px), rgba(141,253,0,0.10) calc(11.11% - 1px) 11.11%), ' +
                'repeating-linear-gradient(90deg, transparent 0 calc(11.11% - 1px), rgba(141,253,0,0.10) calc(11.11% - 1px) 11.11%)',
            }}
          />

          {/* Concern markers */}
          {MARKERS.map((m) => (
            <span
              key={`${m.x}-${m.y}`}
              className="absolute kira-anim-marker"
              style={{
                left: `${m.x}%`,
                top: `${m.y}%`,
                width: 10,
                height: 10,
                marginLeft: -5,
                marginTop: -5,
                borderRadius: '9999px',
                background: '#8DFD00',
                boxShadow: '0 0 8px rgba(141,253,0,0.9), 0 0 0 4px rgba(141,253,0,0.18)',
                opacity: 0,
                animation: `kira-marker 0.6s ease-out ${m.delay}s forwards`,
              }}
            />
          ))}

          {/* Sweeping scan line */}
          <div
            className="absolute left-0 right-0 kira-anim-sweep"
            style={
              {
                top: 0,
                height: 3,
                '--sweep-distance': `${FACE_SIZE - 16}px`,
                background:
                  'linear-gradient(90deg, transparent, rgba(141,253,0,0.95) 50%, transparent)',
                boxShadow: '0 0 12px rgba(141,253,0,0.8)',
                animation: 'kira-sweep 4.8s ease-in-out infinite',
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      {/* Phase text + progress dots */}
      <div className="text-center space-y-3">
        <p key={phase} className="text-white font-semibold text-lg" style={{ animation: 'kira-fade-in 0.4s ease-out' }}>
          {PHASES[phase]}
          <span style={{ color: '#8DFD00' }}>…</span>
        </p>
        <div className="flex items-center justify-center gap-1.5">
          {PHASES.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === phase ? 18 : 6,
                height: 6,
                background: i <= phase ? '#8DFD00' : 'rgba(255,255,255,0.22)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Live biomarker ticker */}
      <div
        className="h-7 overflow-hidden w-full max-w-[260px]"
        style={{ maskImage: 'linear-gradient(180deg, transparent, #000 35%, #000 65%, transparent)' }}
      >
        <div style={{ animation: 'kira-ticker 12s linear infinite' }}>
          {[...TICKER_LINES, ...TICKER_LINES].map(([label, val], i) => (
            <div
              key={i}
              className="flex items-center justify-between h-7"
              style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 11 }}
            >
              <span style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>{label}</span>
              <span style={{ color: '#8DFD00' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
