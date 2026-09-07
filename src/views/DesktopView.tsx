import { QrCode } from '../components/QrCode';
import { useT } from '../session/useT';

/** Strip the `?device=` override so the phone opens the page cleanly. */
function appUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('device');
  return url.toString();
}

function DesktopView() {
  const t = useT();
  return (
    <>
      <p className="font-display max-w-sm text-center text-2xl leading-tight text-balance">
        {t('desktop.title')}
      </p>
      <p className="max-w-sm text-center text-sm text-muted">{t('desktop.instruction')}</p>
      <QrCode value={appUrl()} size={240} label={t('desktop.qrLabel')} />
      <p className="max-w-sm text-center text-sm text-muted">{t('desktop.qrHint')}</p>
    </>
  );
}

export { DesktopView };
