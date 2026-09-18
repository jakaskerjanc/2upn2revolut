import { LanguageToggle } from './LanguageToggle';
import { StepStatus } from './StepStatus';
import { useT } from '../session/useT';

interface AppHeaderProps {
  activeIndex: number;
}

/** Wordmark, step status, and language control — shared by both views. */
function AppHeader({ activeIndex }: AppHeaderProps) {
  const t = useT();
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <span className="text-sm font-medium tracking-tight">{t('app.title')}</span>
      <div className="flex items-center gap-3">
        <StepStatus activeIndex={activeIndex} />
        <LanguageToggle />
      </div>
    </header>
  );
}

export { AppHeader };
