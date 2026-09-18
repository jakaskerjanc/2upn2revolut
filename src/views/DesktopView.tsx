import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AppHeader } from '../components/AppHeader';
import { PaymentSummary } from '../components/PaymentSummary';
import { QrCode } from '../components/QrCode';
import { StepStatus } from '../components/StepStatus';
import { cn } from '../lib/cn';
import { ingestErrorKey, ingestUpn } from '../session/ingest';
import { resolveRevolutLink } from '../session/revolut';
import { decodeImageFile } from '../session/scanner';
import { addPayment, currentPayment, resetPayments, useAppState } from '../session/store';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

/** Strip the `?device=` override so the phone opens the page cleanly. */
function appUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('device');
  return url.toString();
}

/** First image in a list of files, or undefined. */
function firstImage(files: Iterable<File>): File | undefined {
  return Array.from(files).find((file) => file.type.startsWith('image/'));
}

function DesktopView() {
  const state = useAppState();
  const t = useT();
  const sent = currentPayment(state);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [showLaunchQr, setShowLaunchQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const decodingRef = useRef(false);

  const handleFile = useCallback(async (file: Blob) => {
    if (decodingRef.current) return;
    decodingRef.current = true;
    setError(null);
    setBusy(true);
    try {
      const text = await decodeImageFile(file);
      if (text === null) {
        setError('error.noQrInImage');
        return;
      }
      const result = ingestUpn(text);
      if (!result.ok) {
        setError(ingestErrorKey(result.reason));
        return;
      }
      addPayment(result.entry); // flips currentPayment -> result screen
    } finally {
      decodingRef.current = false;
      setBusy(false);
    }
  }, []);

  // Pasting a copied UPN QR is the fastest desktop path, so listen for an image
  // paste anywhere while the input screen is showing.
  useEffect(() => {
    if (sent) return;
    function onPaste(event: ClipboardEvent): void {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith('image/'),
      );
      const file = item?.getAsFile();
      if (file) void handleFile(file);
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [sent, handleFile]);

  if (sent) {
    const revolutLink = resolveRevolutLink(
      window.location.search,
      import.meta.env.VITE_REVOLUT_DEEPLINK,
    );
    return (
      <div className="canvas-glow bg-canvas flex min-h-dvh flex-col">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-5 pb-16 sm:px-8">
          <Badge>{t('phone.ready')}</Badge>
          <QrCode value={sent.epc} size={240} label={t('desktop.epcQrLabel')} />
          <p className="font-display max-w-sm text-center text-2xl leading-tight font-medium text-balance">
            {t('desktop.resultInstruction')}
          </p>
          <div className="flex max-w-sm flex-col items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showLaunchQr}
              aria-controls="revolut-launch-qr"
              onClick={() => setShowLaunchQr((open) => !open)}
            >
              {t('desktop.revolutHelpToggle')}
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className={cn('transition-transform', showLaunchQr && 'rotate-180')}
              >
                <path
                  d="m4 6 4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            {showLaunchQr && (
              <div id="revolut-launch-qr" className="flex flex-col items-center gap-3">
                <QrCode value={revolutLink} size={150} label={t('desktop.revolutQrLabel')} />
                <p className="text-center text-sm text-muted">{t('desktop.revolutHelpCaption')}</p>
              </div>
            )}
          </div>
          <Card className="w-full max-w-sm">
            <CardContent>
              <PaymentSummary payment={sent.payment} />
            </CardContent>
          </Card>
          <Button
            variant="outline"
            onClick={() => {
              setShowLaunchQr(false);
              resetPayments();
            }}
          >
            {t('desktop.convertAnother')}
          </Button>
        </main>
        <footer className="flex justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
          <StepStatus activeIndex={1} />
        </footer>
      </div>
    );
  }

  return (
    <div className="canvas-glow bg-canvas flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-2 lg:items-center">
        <section className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          <h1 className="font-display text-5xl leading-[1.05] font-medium tracking-[-0.03em] text-balance">
            {t('desktop.uploadTitle')}
          </h1>
          <p className="max-w-md text-lg text-muted">{t('desktop.uploadInstruction')}</p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = firstImage(event.dataTransfer.files);
              if (file) void handleFile(file);
            }}
            className="rounded-card border-line bg-surface flex w-[min(88vw,26rem)] flex-col items-center gap-4 border border-dashed p-8"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = '';
              }}
            />
            <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              {t('desktop.uploadButton')}
            </Button>
            <p className="text-center text-sm text-muted">
              {busy ? t('desktop.decoding') : t('desktop.uploadHint')}
            </p>
            {error && <p className="text-center text-sm text-danger">{t(error)}</p>}
          </div>
        </section>
        <aside className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted">{t('desktop.orPhoneTitle')}</p>
          <QrCode value={appUrl()} size={150} label={t('desktop.qrLabel')} />
          <p className="max-w-sm text-center text-sm text-muted">{t('desktop.qrHint')}</p>
        </aside>
      </main>
      <footer className="flex justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
        <StepStatus activeIndex={0} />
      </footer>
    </div>
  );
}

export { DesktopView };
