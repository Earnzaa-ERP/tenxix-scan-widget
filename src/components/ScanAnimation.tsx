export function ScanAnimation() {
  return (
    <div className="relative w-32 h-32">
      <div className="absolute inset-0 rounded-full border-2 border-[var(--color-accent)] opacity-20 animate-scan-pulse" />
      <div className="absolute inset-3 rounded-full border-2 border-[var(--color-accent)] opacity-40 animate-scan-pulse [animation-delay:0.4s]" />
      <div className="absolute inset-6 rounded-full border-2 border-[var(--color-accent)] opacity-60 animate-scan-pulse [animation-delay:0.8s]" />
      <div className="absolute inset-9 rounded-full bg-[var(--color-accent)] opacity-10 animate-scan-pulse [animation-delay:1.2s]" />
    </div>
  );
}
