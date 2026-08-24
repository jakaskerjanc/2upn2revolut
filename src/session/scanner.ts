import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import type { CameraError } from './store';

export interface ScannerHandle {
  stop(): void;
}

function classifyError(error: unknown): CameraError {
  if (!window.isSecureContext) return 'insecure-context';
  const name = (error as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'not-found';
  return 'unknown';
}

/**
 * Start continuous QR scanning on the rear camera.
 *
 * Imperative on purpose — it is started from an event, not from an effect, so
 * StrictMode's double mount cannot kill a live getUserMedia stream. Decode
 * failures are not errors: a non-UPN QR, or no QR at all, is the normal state
 * of the viewfinder, so the callback only fires on a successful read.
 */
export function startScanner(
  video: HTMLVideoElement,
  onDecode: (text: string) => void,
  onError: (error: CameraError) => void,
): ScannerHandle {
  const reader = new BrowserQRCodeReader();
  let controls: IScannerControls | null = null;
  let stopped = false;

  void reader
    .decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video, (result) => {
      if (result) onDecode(result.getText());
    })
    .then((scannerControls) => {
      controls = scannerControls;
      if (stopped) scannerControls.stop();
    })
    .catch((error: unknown) => {
      if (!stopped) onError(classifyError(error));
    });

  return {
    stop(): void {
      stopped = true;
      controls?.stop();
      controls = null;
    },
  };
}
