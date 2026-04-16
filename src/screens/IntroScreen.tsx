import type { WidgetConfig } from '../types';
import { ErrorBanner } from '../components/ErrorBanner';
import { BRAND } from '../constants';

interface IntroScreenProps {
  config: WidgetConfig | null;
  configLoading: boolean;
  configError: string | null;
  onStart: () => void;
}

export function IntroScreen({ config, configLoading, configError, onStart }: IntroScreenProps) {
  const canStart = config && !configError && config.products.length > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">{BRAND.tagline}</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-[320px]">{BRAND.subtitle}</p>
      </div>

      {configError && <ErrorBanner message={configError} />}

      {config && config.products.length === 0 && !configError && (
        <ErrorBanner message="This scan is not currently available." variant="warning" />
      )}

      <button
        onClick={onStart}
        disabled={!canStart || configLoading}
        className="w-full max-w-[280px] py-3.5 bg-[var(--color-accent)] text-white rounded-xl font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
      >
        {configLoading ? 'Loading...' : 'Start Skin Scan'}
      </button>
    </div>
  );
}
