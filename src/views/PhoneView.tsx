import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AppHeader } from '../components/AppHeader';
import { PaymentSummary } from '../components/PaymentSummary';
import { QrCode } from '../components/QrCode';
import { StepStatus } from '../components/StepStatus';
import { dataUrlToBlob, qrFileName, qrPngDataUrl } from '../core/qr-image';
import { attachScanner, scanAnother } from '../session/phone-session';
import { saveQrImage } from '../session/save';
import { phoneStep } from '../session/steps';
import { openRevolut, resolveRevolutLink, REVOLUT_WEB_URL } from '../session/revolut';
import { currentPayment, setNotice, useAppState, type CameraError } from '../session/store';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

const STEP_INDEX = { scan: 0, pay: 1 } as const;

const CAMERA_ERROR_KEYS: Record<CameraError, TranslationKey> = {
  denied: 'phone.cameraDenied',
  'not-found': 'phone.cameraNotFound',
  'insecure-context': 'phone.cameraInsecure',
  unknown: 'phone.cameraDenied',
};

function PhoneView() {
  const state = useAppState();
  const t = useT();
  const step = phoneStep(state);
  const sent = currentPayment(state);
  const [revolutFailed, setRevolutFailed] = useState(false);

  useEffect(() => {
    if (!state.notice) return;
    toast.error(t(state.notice));
    setNotice(null);
  }, [state.notice, t]);

  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    attachScanner(element);
  }, []);

  const onSave = useCallback(async () => {
    if (!sent) return;
    try {
      // Must run straight off the tap: iOS blocks share()/download otherwise.
      const blob = dataUrlToBlob(await qrPngDataUrl(sent.epc));
      await saveQrImage(blob, qrFileName(sent.payment));
    } catch (error) {
      // A cancelled share sheet is not a failure; anything else is.
      if ((error as { name?: string })?.name === 'AbortError') return;
      setNotice('error.saveFailed');
    }
  }, [sent]);

  const onOpenRevolut = useCallback(() => {
    setRevolutFailed(false);
    openRevolut(
      resolveRevolutLink(window.location.search, import.meta.env.VITE_REVOLUT_DEEPLINK),
      () => setRevolutFailed(true),
    );
  }, []);

  return (
    <div className="canvas-glow bg-canvas flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-5 pb-16 sm:px-8">
        {step === 'pay' && sent ? (
          <>
            <Badge>{t('phone.ready')}</Badge>
            <QrCode value={sent.epc} size={240} label={t('phone.saveInstruction')} />
            <p className="max-w-sm text-center text-sm text-muted">{t('phone.saveHelp')}</p>
            <Button size="lg" onClick={onSave}>
              {t('phone.saveButton')}
            </Button>
            <p className="font-display max-w-sm text-center text-xl leading-tight text-balance">
              {t('phone.payInstruction')}
            </p>
            {revolutFailed ? (
              <div className="flex max-w-sm flex-col items-center gap-3">
                <p className="text-center text-sm text-muted">{t('phone.revolutFailed')}</p>
                <Button asChild variant="outline">
                  <a href={REVOLUT_WEB_URL} target="_blank" rel="noreferrer">
                    {t('phone.revolutStore')}
                  </a>
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={onOpenRevolut}>
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
        ) : state.cameraError ? (
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-ink">{t(CAMERA_ERROR_KEYS[state.cameraError])}</p>
            <p className="text-sm text-muted">{t('phone.cameraDeniedHelp')}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t('phone.cameraRetry')}
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-center text-3xl leading-tight font-medium tracking-[-0.02em]">
              {t('phone.scanTitle')}
            </h1>
            <p className="max-w-sm text-center text-sm text-muted">{t('phone.scanInstruction')}</p>
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label={t('phone.scanTitle')}
              className="rounded-card w-[min(88vw,26rem)] bg-ink/90 object-cover shadow-sm"
            />
          </>
        )}
      </main>
      <footer className="flex justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
        <StepStatus activeIndex={STEP_INDEX[step]} />
      </footer>
    </div>
  );
}

export { PhoneView };
