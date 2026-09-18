import { LanguageToggle } from './LanguageToggle';
import { useT } from '../session/useT';

/** Wordmark and language control — shared by both views. */
function AppHeader() {
  const t = useT();
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <span className="text-sm font-medium tracking-tight">{t('app.title')}</span>
      <LanguageToggle />
    </header>
  );
}

export { AppHeader };
