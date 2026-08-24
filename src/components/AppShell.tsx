import type { ReactNode } from 'react';
import { LanguageToggle } from './LanguageToggle';
import { Stepper } from './Stepper';
import { useT } from '../session/useT';

interface AppShellProps {
  activeIndex: number;
  children: ReactNode;
}

function AppShell({ activeIndex, children }: AppShellProps) {
  const t = useT();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <span className="text-sm font-medium tracking-tight">{t('app.title')}</span>
        <LanguageToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-5 pb-10 sm:px-8">
        {children}
      </main>

      <footer className="flex justify-center px-5 pb-8 sm:px-8">
        <Stepper activeIndex={activeIndex} />
      </footer>
    </div>
  );
}

export { AppShell };
