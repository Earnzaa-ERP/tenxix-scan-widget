import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white flex flex-col items-center">
      <div className="w-full max-w-[440px] min-h-dvh flex flex-col bg-white shadow-sm">
        <header className="flex items-center justify-center py-3 px-4 border-b border-gray-100">
          <img src="/tenxix-logo.svg" alt="Tenxix Beauty" className="h-7" />
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
