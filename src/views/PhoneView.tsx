import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { PaymentSummary } from '../components/PaymentSummary';
import { attachScanner, scanAnother, startPhoneSession } from '../session/phone-session';
import { phoneStep } from '../session/steps';
import { openRevolut, resolveRevolutLink, REVOLUT_WEB_URL } from '../session/revolut';
import { currentPayment, setNotice, useAppState, type CameraError } from '../session/store';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

const STEP_INDEX = { connect: 0, scan: 1, pay: 2 } as const;

const CAMERA_ERROR_KEYS: Record<CameraError, TranslationKey> = {
  denied: 'phone.cameraDenied',
  'not-found': 'phone.cameraNotFound',
  'insecure-context': 'phone.cameraInsecure',
  unknown: 'phone.cameraDenied',
};

function PhoneView({
  peerId,
  onStepChange,
}: {
  peerId: string;
  onStepChange: (index: number) => void;
}) {
  const state = useAppState();
  const t = useT();
  const step = phoneStep(state);
  const sent = currentPayment(state);
  const [revolutFailed, setRevolutFailed] = useState(false);

  useEffect(() => {
    startPhoneSession(peerId);
  }, [peerId]);

  useEffect(() => {
    onStepChange(STEP_INDEX[step]);
  }, [step, onStepChange]);

  useEffect(() => {
    if (!state.notice) return;
    toast.error(t(state.notice));
    setNotice(null);
  }, [state.notice, t]);

  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    attachScanner(element);
  }, []);

  const onOpenRevolut = useCallback(() => {
    setRevolutFailed(false);
    // Must run straight off the tap: iOS blocks programmatic scheme navigation.
    openRevolut(
      resolveRevolutLink(window.location.search, import.meta.env.VITE_REVOLUT_DEEPLINK),
      () => setRevolutFailed(true),
    );
  }, []);

  if (step === 'pay' && sent) {
    return (
      <>
        <Badge>{t('phone.sent')}</Badge>
        <p className="font-display max-w-sm text-center text-2xl leading-tight text-balance">
          {t('phone.payInstruction')}
        </p>
        {revolutFailed ? (
          // The scheme is not registered on this device. Swap the accelerator for
          // something that definitely works; the instruction above still stands.
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="text-center text-sm text-muted">{t('phone.revolutFailed')}</p>
            <Button asChild variant="outline">
              <a href={REVOLUT_WEB_URL} target="_blank" rel="noreferrer">
                {t('phone.revolutStore')}
              </a>
            </Button>
          </div>
        ) : (
          <Button size="lg" onClick={onOpenRevolut}>
            {t('phone.openRevolut')}
          </Button>
        )}
        <Card className="w-full max-w-sm">
          <CardContent>
            <PaymentSummary payment={sent.payment} />
          </CardContent>
        </Card>
        <Button variant="outline" onClick={scanAnother}>
          {t('phone.scanAnother')}
        </Button>
      </>
    );
  }

  if (step === 'scan') {
    return (
      <>
        <p className="font-display max-w-sm text-center text-2xl leading-tight text-balance">
          {t('phone.scanInstruction')}
        </p>
        {state.cameraError ? (
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-ink">{t(CAMERA_ERROR_KEYS[state.cameraError])}</p>
            <p className="text-sm text-muted">{t('phone.cameraDeniedHelp')}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t('phone.cameraRetry')}
            </Button>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label={t('phone.scanTitle')}
            className="rounded-card w-[min(88vw,26rem)] bg-ink/90 object-cover shadow-sm"
          />
        )}
      </>
    );
  }

  return (
    <>
      <p className="font-display max-w-sm text-center text-2xl leading-tight text-balance">
        {t('phone.connectingInstruction')}
      </p>
      <p className="text-sm text-muted">{t('phone.connectingTitle')}</p>
    </>
  );
}

export { PhoneView };
