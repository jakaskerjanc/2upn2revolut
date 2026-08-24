import { useEffect, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { PaymentSummary } from '../components/PaymentSummary';
import { QrCode } from '../components/QrCode';
import { hostStep } from '../session/steps';
import { startHostSession } from '../session/host-session';
import { currentPayment, showPayment, useAppState } from '../session/store';
import { useT } from '../session/useT';

const STEP_INDEX = { pair: 0, waiting: 1, display: 2 } as const;

function pairingUrl(peerId: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/p/${peerId}`;
}

function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    setCoarse(window.matchMedia('(pointer: coarse)').matches);
  }, []);
  return coarse;
}

function HostView({ onStepChange }: { onStepChange: (index: number) => void }) {
  const state = useAppState();
  const t = useT();
  const step = hostStep(state);
  const shown = currentPayment(state);
  const coarsePointer = useIsCoarsePointer();

  useEffect(() => {
    // No cleanup: the peer is a page-lifetime singleton that must survive
    // StrictMode's double mount and any view remount.
    startHostSession();
  }, []);

  useEffect(() => {
    onStepChange(STEP_INDEX[step]);
  }, [step, onStepChange]);

  if (step === 'display' && shown) {
    return (
      <>
        <p className="font-display max-w-xl text-center text-3xl leading-tight text-balance sm:text-4xl">
          {t('host.displayInstruction')}
        </p>
        <QrCode
          value={shown.epc}
          size={512}
          label={t('host.displayTitle')}
          className="w-[min(78vw,26rem)]"
        />
        <Card className="w-full max-w-md">
          <CardContent>
            <PaymentSummary payment={shown.payment} />
          </CardContent>
        </Card>
        {state.payments.length > 1 && (
          <section className="flex w-full max-w-md flex-col items-center gap-3">
            <h2 className="text-xs tracking-widest text-muted uppercase">{t('host.recent')}</h2>
            <ul className="flex flex-wrap justify-center gap-3">
              {state.payments.map((entry) => (
                <li key={entry.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-auto p-0"
                        aria-current={entry.id === shown.id}
                        onClick={() => showPayment(entry.id)}
                      >
                        <QrCode
                          value={entry.epc}
                          size={128}
                          label={entry.payment.name}
                          className={
                            entry.id === shown.id ? 'w-16 p-1.5 ring-2 ring-accent' : 'w-16 p-1.5'
                          }
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('host.recentHint')}</TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }

  if (step === 'waiting') {
    return (
      <>
        <Badge>{t('host.waitingTitle')}</Badge>
        <p className="font-display max-w-xl text-center text-3xl leading-tight text-balance sm:text-4xl">
          {t('host.waitingInstruction')}
        </p>
      </>
    );
  }

  return (
    <>
      {coarsePointer && (
        <p className="max-w-md rounded-card border border-line bg-surface px-5 py-4 text-center text-sm text-muted">
          {t('host.mobileWarning')}
        </p>
      )}
      <p className="font-display max-w-xl text-center text-3xl leading-tight text-balance sm:text-4xl">
        {t('host.pairInstruction')}
      </p>
      {state.peerId ? (
        <QrCode
          value={pairingUrl(state.peerId)}
          size={384}
          label={t('host.pairTitle')}
          className="w-[min(70vw,20rem)]"
        />
      ) : (
        <p className="text-muted">{t('host.pairPending')}</p>
      )}
      <p className="max-w-sm text-center text-sm text-muted">{t('host.pairHint')}</p>
    </>
  );
}

export { HostView };
