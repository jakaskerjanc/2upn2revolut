import type { TranslationKey } from '../i18n';
import { ingestErrorKey, ingestUpn } from './ingest';
import { startScanner, type ScannerHandle } from './scanner';
import { addPayment, getState, resetPayments, setCameraError, setNotice } from './store';

let scanner: ScannerHandle | null = null;
let scannerVideo: HTMLVideoElement | null = null;
let detachTimer: number | null = null;
let lastNoticeAt = 0;

/** A bad read repeats many times a second; only surface it occasionally. */
const NOTICE_COOLDOWN_MS = 3000;

function notice(key: TranslationKey): void {
  const now = Date.now();
  if (now - lastNoticeAt < NOTICE_COOLDOWN_MS) return;
  lastNoticeAt = now;
  setNotice(key);
}

function handleDecode(text: string): void {
  // Already scanned this bill; ignore whatever is still in frame.
  if (getState().payments.length > 0) return;

  const result = ingestUpn(text);
  if (!result.ok) {
    // 'not-upn' is the normal state of a viewfinder — stay silent and keep scanning.
    if (result.reason !== 'not-upn') notice(ingestErrorKey(result.reason));
    return;
  }

  addPayment(result.entry);
  stopScanner();
}

function stopScanner(): void {
  scanner?.stop();
  scanner = null;
  scannerVideo = null;
}

/**
 * Attach or detach the camera from a video element.
 *
 * StrictMode detaches and immediately reattaches the same node, so a detach
 * defers one task and is cancelled if the node comes straight back — otherwise
 * every mount would restart getUserMedia and flash the viewfinder.
 */
export function attachScanner(video: HTMLVideoElement | null): void {
  if (!video) {
    detachTimer = window.setTimeout(() => {
      detachTimer = null;
      stopScanner();
    }, 0);
    return;
  }

  if (detachTimer !== null) {
    window.clearTimeout(detachTimer);
    detachTimer = null;
  }

  if (scanner && scannerVideo === video) return;

  stopScanner();
  scannerVideo = video;
  setCameraError(null);
  scanner = startScanner(video, handleDecode, setCameraError);
}

/** Return to the camera for the next bill. */
export function scanAnother(): void {
  resetPayments();
}
