interface ErrorBannerProps {
  message: string;
  variant?: 'error' | 'warning';
}

export function ErrorBanner({ message, variant = 'error' }: ErrorBannerProps) {
  const bg = variant === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700';

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${bg}`}>
      {message}
    </div>
  );
}
