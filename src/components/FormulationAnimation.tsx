import { useEffect, useState } from 'react';

// Mirrors the app's FormulationScreen — the loading state shown while the AM/PM
// routine is generated. An orbital constellation of ingredient pills rotates
// around a pulsing core, ingredients highlight in turn, skeleton step-cards
// assemble, and phase text cycles. Dark purple surface; lime accents.
//
// NOTE: wire this in as the loading state of the routine-generation step once
// the backend returns a regimen (see items 5-6). Until then it's standalone.

const PHASES = [
  'Reading your skin report',
  'Cross-referencing ingredient compatibility',
  'Calibrating active strength for your Fitzpatrick',
  'Assembling morning + evening steps',
  'Finalising your routine',
];

const INGREDIENTS = [
  'Niacinamide',
  'Vitamin C',
  'Tranexamic Acid',
  'Alpha Arbutin',
  'Kojic Acid',
  'Hyaluronic Acid',
  'Retinol',
  'Bakuchiol',
];

const STEP_SLOTS = ['STEP 01 · MORNING', 'STEP 02 · MORNING', 'STEP 01 · EVENING', 'STEP 02 · EVENING'];

const BOX = 240; // orbital area px
const CENTER = BOX / 2;
const RADIUS = 96;

// Pre-compute pill positions around the circle (top start, clockwise).
const PILL_POS = INGREDIENTS.map((_, i) => {
  const angle = (i / INGREDIENTS.length) * 2 * Math.PI - Math.PI / 2;
  return { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) };
});

export function FormulationAnimation() {
  const [phase, setPhase] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const phaseId = setInterval(() => {
      setPhase((p) => (p < PHASES.length - 1 ? p + 1 : p));
    }, 4500);
    const ingId = setInterval(() => {
      setActive((a) => (a + 1) % INGREDIENTS.length);
    }, 1400);
    return () => {
      clearInterval(phaseId);
      clearInterval(ingId);
    };
  }, []);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-8 w-full"
      style={{ background: 'radial-gradient(120% 80% at 50% 0%, #1A0235 0%, #0A0410 70%)' }}
    >
      {/* Orbital constellation */}
      <div className="relative shrink-0" style={{ width: BOX, height: BOX }}>
        {/* Static dashed orbit guide */}
        <span
          className="absolute rounded-full"
          style={{
            left: CENTER - RADIUS,
            top: CENTER - RADIUS,
            width: RADIUS * 2,
            height: RADIUS * 2,
            border: '1px dashed rgba(255,255,255,0.10)',
          }}
        />

        {/* Pulse rings from the core */}
        {[0, 1.5].map((delay) => (
          <span
            key={delay}
            className="absolute rounded-full"
            style={{
              left: CENTER - RADIUS,
              top: CENTER - RADIUS,
              width: RADIUS * 2,
              height: RADIUS * 2,
              border: '1.5px solid #8DFD00',
              animation: `kira-pulse-ring 3s ease-out ${delay}s infinite`,
            }}
          />
        ))}

        {/* Rotating ring of ingredient pills */}
        <div
          className="absolute inset-0"
          style={{ transformOrigin: 'center', animation: 'kira-orbit 28s linear infinite' }}
        >
          {INGREDIENTS.map((name, i) => {
            const on = i === active;
            return (
              <div
                key={name}
                className="absolute"
                style={{ left: PILL_POS[i].x, top: PILL_POS[i].y, transform: 'translate(-50%, -50%)' }}
              >
                {/* Counter-rotate so text stays upright */}
                <span
                  className="block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors duration-500"
                  style={{
                    animation: 'kira-orbit 28s linear infinite reverse',
                    border: `1px solid ${on ? '#8DFD00' : 'rgba(255,255,255,0.16)'}`,
                    background: on ? 'rgba(141,253,0,0.16)' : 'rgba(255,255,255,0.04)',
                    color: on ? '#8DFD00' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pulsing core */}
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            left: CENTER - 28,
            top: CENTER - 28,
            width: 56,
            height: 56,
            background: 'rgba(141,253,0,0.10)',
            border: '1.5px solid rgba(141,253,0,0.5)',
            boxShadow: '0 0 24px rgba(141,253,0,0.35)',
            animation: 'kira-breathe 3.6s ease-in-out infinite',
          }}
        >
          <span style={{ color: '#8DFD00', fontSize: 20 }}>✦</span>
        </div>
      </div>

      {/* Phase text + progress dots */}
      <div className="text-center space-y-3">
        <p key={phase} className="text-white font-semibold text-base" style={{ animation: 'kira-fade-in 0.4s ease-out' }}>
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

      {/* Assembling step skeletons */}
      <div className="w-full max-w-[300px] space-y-2.5">
        {STEP_SLOTS.map((label, i) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-xl p-3"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(141,253,0,0.15)',
              opacity: 0,
              animation: `kira-fade-in 0.5s ease-out ${1.8 + i * 1.4}s forwards`,
            }}
          >
            <p className="text-[9px] tracking-widest mb-2" style={{ color: 'rgba(141,253,0,0.7)' }}>{label}</p>
            <div className="h-2 rounded-full w-3/4 mb-1.5" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-2 rounded-full w-1/2" style={{ background: 'rgba(255,255,255,0.05)' }} />
            {/* Shimmer sweep */}
            <span
              className="absolute inset-y-0 w-1/3"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(141,253,0,0.18), transparent)',
                animation: `kira-shimmer 1.8s linear ${i * 0.4}s infinite`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
