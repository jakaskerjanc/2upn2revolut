import { createPeerJsTransport } from '../transport/peerjs-transport';
import type { Transport } from '../transport/types';
import { addPayment, setConnected, setPeerId, setTransportError } from './store';

let transport: Transport | null = null;

/**
 * Idempotent by design: StrictMode invokes mount effects twice, and a second
 * peer would take a second id and orphan the pairing QR already on screen.
 */
export function startHostSession(): void {
  if (transport) return;

  const created = createPeerJsTransport();
  transport = created;

  created.subscribe((event) => {
    switch (event.type) {
      case 'open':
        setPeerId(event.peerId);
        break;
      case 'connected':
        setConnected(true);
        break;
      case 'disconnected':
        setConnected(false);
        break;
      case 'message':
        if (event.message.type === 'payment') {
          addPayment({
            id: crypto.randomUUID(),
            epc: event.message.epc,
            payment: event.message.payment,
          });
        }
        break;
      case 'error':
        setTransportError(event.code);
        break;
    }
  });

  void created.host().catch(() => {
    // createPeerJsTransport already emitted the error event that set the
    // store's transportError; nothing further to do here.
  });
}

export function stopHostSession(): void {
  transport?.close();
  transport = null;
}
