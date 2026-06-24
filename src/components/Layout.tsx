import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white flex flex-col items-center">
      <div className="w-full max-w-[440px] min-h-dvh flex flex-col bg-white shadow-sm">
        <header className="flex items-center justify-center py-3 px-4 border-b border-gray-100">
          <span className="text-xl font-extrabold tracking-tight lowercase text-[var(--color-primary)]">
            kira<span className="text-[var(--color-accent)] [-webkit-text-stroke:0.5px_var(--color-primary)]">.</span>
          </span>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
