import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from './components/AppShell';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import { useRoute } from './router';
import { setTransportError, useAppState } from './session/store';
import { useT } from './session/useT';
import { HostView } from './views/HostView';
import { PhoneView } from './views/PhoneView';
import type { TranslationKey } from './i18n';
import type { TransportErrorCode } from './transport/types';

const TRANSPORT_ERROR_KEYS: Record<TransportErrorCode, TranslationKey> = {
  'peer-unavailable': 'error.peerUnavailable',
  'browser-incompatible': 'error.browserIncompatible',
  network: 'error.network',
  'server-error': 'error.serverError',
  unknown: 'error.unknown',
};

export default function App() {
  const route = useRoute();
  const { transportError } = useAppState();
  const t = useT();
  const [stepIndex, setStepIndex] = useState(0);
  const onStepChange = useCallback((index: number) => setStepIndex(index), []);

  useEffect(() => {
    if (!transportError) return;
    toast.error(t(TRANSPORT_ERROR_KEYS[transportError]));
    setTransportError(null);
  }, [transportError, t]);

  return (
    <TooltipProvider>
      <AppShell activeIndex={stepIndex}>
        {route.name === 'host' ? (
          <HostView onStepChange={onStepChange} />
        ) : (
          <PhoneView peerId={route.peerId} onStepChange={onStepChange} />
        )}
      </AppShell>
      <Toaster />
    </TooltipProvider>
  );
}
