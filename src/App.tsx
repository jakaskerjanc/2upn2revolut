import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import { detectDevice } from './device';
import { useAppState } from './session/store';
import { DesktopView } from './views/DesktopView';
import { PhoneView } from './views/PhoneView';

export default function App() {
  const { lang } = useAppState();
  const device = useMemo(() => detectDevice(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const onStepChange = useCallback((index: number) => setStepIndex(index), []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <TooltipProvider>
      <AppShell activeIndex={stepIndex}>
        {device === 'desktop' ? (
          <DesktopView onStepChange={onStepChange} />
        ) : (
          <PhoneView onStepChange={onStepChange} />
        )}
      </AppShell>
      <Toaster />
    </TooltipProvider>
  );
}
