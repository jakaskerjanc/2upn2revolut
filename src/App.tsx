import { useEffect, useMemo } from 'react';
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

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <TooltipProvider>
      <AppShell>
        {device === 'desktop' ? <DesktopView /> : <PhoneView />}
      </AppShell>
      <Toaster />
    </TooltipProvider>
  );
}
