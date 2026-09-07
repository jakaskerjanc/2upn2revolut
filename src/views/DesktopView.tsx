import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { PaymentSummary } from '../components/PaymentSummary';
import { QrCode } from '../components/QrCode';
import { ingestErrorKey, ingestUpn } from '../session/ingest';
import { resolveRevolutLink } from '../session/revolut';
import { decodeImageFile } from '../session/scanner';
import { addPayment, currentPayment, resetPayments, useAppState } from '../session/store';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

const STEP_INDEX = { input: 0, result: 1 } as const;

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

function DesktopView({ onStepChange }: { onStepChange: (index: number) => void }) {
  const state = useAppState();
  const t = useT();
  const sent = currentPayment(state);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const decodingRef = useRef(false);

  useEffect(() => {
    onStepChange(sent ? STEP_INDEX.result : STEP_INDEX.input);
  }, [sent, onStepChange]);

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
      <>
        <Badge>{t('phone.ready')}</Badge>
        <QrCode value={sent.epc} size={240} label={t('desktop.epcQrLabel')} />
        <p className="font-display max-w-sm text-center text-xl leading-tight text-balance">
          {t('desktop.resultInstruction')}
        </p>
        <div className="flex max-w-sm flex-col items-center gap-3">
          <QrCode value={revolutLink} size={150} label={t('desktop.revolutQrLabel')} />
          <p className="text-center text-sm text-muted">{t('desktop.revolutQrCaption')}</p>
        </div>
        <Card className="w-full max-w-sm">
          <CardContent>
            <PaymentSummary payment={sent.payment} />
          </CardContent>
        </Card>
        <Button variant="outline" onClick={resetPayments}>
          {t('desktop.convertAnother')}
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="font-display max-w-sm text-center text-2xl leading-tight text-balance">
        {t('desktop.uploadTitle')}
      </p>
      <p className="max-w-sm text-center text-sm text-muted">{t('desktop.uploadInstruction')}</p>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = firstImage(event.dataTransfer.files);
          if (file) void handleFile(file);
        }}
        className="rounded-card flex w-[min(88vw,26rem)] flex-col items-center gap-4 border border-dashed border-line bg-surface p-8"
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
        {error && <p className="text-center text-sm text-ink">{t(error)}</p>}
      </div>
      <div className="flex max-w-sm flex-col items-center gap-3">
        <p className="text-sm text-muted">{t('desktop.orPhoneTitle')}</p>
        <QrCode value={appUrl()} size={150} label={t('desktop.qrLabel')} />
        <p className="max-w-sm text-center text-sm text-muted">{t('desktop.qrHint')}</p>
      </div>
    </>
  );
}

export { DesktopView };
