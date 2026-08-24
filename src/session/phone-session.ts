import { buildEpcPayload } from '../core/epc';
import { decodeUpn } from '../core/upn';
import { paymentMessage } from '../transport/protocol';
import { createPeerJsTransport } from '../transport/peerjs-transport';
import type { Transport } from '../transport/types';
import type { TranslationKey } from '../i18n';
import { startScanner, type ScannerHandle } from './scanner';
import {
  addPayment,
  getState,
  resetPayments,
  setCameraError,
  setConnected,
  setNotice,
  setPeerId,
  setTransportError,
} from './store';

let transport: Transport | null = null;
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
  // Already sent this bill; ignore whatever is still in frame.
  if (getState().payments.length > 0) return;

  const decoded = decodeUpn(text);
  if (!decoded.ok) {
    // 'not-upn' is the normal state of a viewfinder — stay silent and keep scanning.
    if (decoded.reason === 'malformed') notice('error.upnMalformed');
    return;
  }

  const epc = buildEpcPayload(decoded.payment);
  if (!epc.ok) {
    notice(epc.reason === 'missing-iban' ? 'error.epcIban' : 'error.epcAmount');
    return;
  }

  transport?.send(paymentMessage(epc.payload, decoded.payment));
  addPayment({ id: crypto.randomUUID(), epc: epc.payload, payment: decoded.payment });
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

/** Idempotent for the same reason as the host session: StrictMode double mount. */
export function startPhoneSession(hostPeerId: string): void {
  if (transport) return;

  const created = createPeerJsTransport();
  transport = created;
  setPeerId(hostPeerId);

  created.subscribe((event) => {
    switch (event.type) {
      case 'connected':
        setConnected(true);
        break;
      case 'disconnected':
        setConnected(false);
        break;
      case 'error':
        setTransportError(event.code);
        break;
      case 'open':
      case 'message':
        break;
    }
  });

  void created.join(hostPeerId).catch(() => {
    // The transport already emitted the error event that set transportError.
  });
}

/** Return to the camera for the next bill. */
export function scanAnother(): void {
  resetPayments();
}

export function stopPhoneSession(): void {
  stopScanner();
  transport?.close();
  transport = null;
}
