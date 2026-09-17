import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Hero } from '../components/Hero';
import { LanguageToggle } from '../components/LanguageToggle';
import { PaymentSummary } from '../components/PaymentSummary';
import { QrCode } from '../components/QrCode';
import { Sheet } from '../components/Sheet';
import { StepPills } from '../components/StepPills';
import { formatEuros } from '../core/payment';
import { dataUrlToBlob, qrPngDataUrl } from '../core/qr-image';
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
      await saveQrImage(blob, 'epc-qr.png');
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
    <div className="bg-canvas flex min-h-dvh flex-col">
      <Hero>
        <header className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium tracking-tight">{t('app.title')}</span>
          <LanguageToggle tone="hero" />
        </header>
        <div className="flex flex-col gap-3">
          <StepPills activeIndex={STEP_INDEX[step]} tone="hero" />
          {step === 'pay' && sent ? (
            <>
              <p className="text-xs font-medium tracking-[0.15em] text-white/80 uppercase">
                {t('phone.ready')}
              </p>
              <p className="font-display text-5xl leading-none font-medium tracking-[-0.035em] tabular-nums">
                EUR {formatEuros(sent.payment.amountCents)}
              </p>
              {sent.payment.name.trim().length > 0 && (
                <p className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-sm">
                  {sent.payment.name}
                </p>
              )}
            </>
          ) : (
            <h1 className="font-display text-3xl leading-tight font-medium tracking-[-0.02em]">
              {t('phone.scanTitle')}
            </h1>
          )}
        </div>
      </Hero>

      <Sheet className="flex-1">
        {step === 'pay' && sent ? (
          <>
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
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label={t('phone.scanTitle')}
              className="rounded-card w-[min(88vw,26rem)] bg-ink/90 object-cover shadow-sm"
            />
            <p className="max-w-sm text-center text-sm text-muted">
              {t('phone.scanInstruction')}
            </p>
          </>
        )}
      </Sheet>
    </div>
  );
}

export { PhoneView };
