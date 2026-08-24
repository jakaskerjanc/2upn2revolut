import Peer, { type DataConnection } from 'peerjs';
import { generatePeerId } from './peer-id';
import { helloMessage, parseWireMessage, type WireMessage } from './protocol';
import type { Transport, TransportErrorCode, TransportEvent } from './types';

const MAX_ID_RETRIES = 5;
const MAX_NETWORK_RETRIES = 4;
const BASE_BACKOFF_MS = 800;

interface PeerError extends Error {
  type?: string;
}

function mapErrorCode(type: string | undefined): TransportErrorCode {
  switch (type) {
    case 'peer-unavailable':
      return 'peer-unavailable';
    case 'browser-incompatible':
    case 'webrtc':
      return 'browser-incompatible';
    case 'network':
    case 'socket-error':
    case 'socket-closed':
    case 'disconnected':
      return 'network';
    case 'server-error':
    case 'ssl-unavailable':
      return 'server-error';
    default:
      return 'unknown';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createPeerJsTransport(): Transport {
  const listeners = new Set<(event: TransportEvent) => void>();
  let peer: Peer | null = null;
  let connection: DataConnection | null = null;
  let closed = false;

  function emit(event: TransportEvent): void {
    for (const listener of listeners) listener(event);
  }

  function attachConnection(conn: DataConnection, sendHello: boolean): void {
    connection = conn;

    conn.on('open', () => {
      if (sendHello) conn.send(helloMessage());
      emit({ type: 'connected' });
    });

    conn.on('data', (data) => {
      const message = parseWireMessage(data);
      // A frame we cannot validate is dropped silently: the broker is public,
      // and a malformed frame must not be able to move this app's state.
      if (message) emit({ type: 'message', message });
    });

    conn.on('close', () => {
      if (connection === conn) connection = null;
      emit({ type: 'disconnected' });
    });

    conn.on('error', (error: PeerError) => {
      emit({ type: 'error', code: mapErrorCode(error.type) });
    });
  }

  /**
   * Create a Peer with a self-assigned id, retrying on `unavailable-id`
   * (regenerate, silent) and on `network` (exponential backoff, surfaced).
   */
  async function createPeer(): Promise<Peer> {
    let idAttempts = 0;
    let networkAttempts = 0;

    for (;;) {
      const candidate = new Peer(generatePeerId());
      try {
        return await new Promise<Peer>((resolve, reject) => {
          const onOpen = (): void => {
            candidate.off('error', onError);
            resolve(candidate);
          };
          const onError = (error: PeerError): void => {
            candidate.off('open', onOpen);
            candidate.destroy();
            reject(error);
          };
          candidate.once('open', onOpen);
          candidate.once('error', onError);
        });
      } catch (error) {
        if (closed) throw error;
        const code = mapErrorCode((error as PeerError).type);

        if ((error as PeerError).type === 'unavailable-id' && idAttempts < MAX_ID_RETRIES) {
          idAttempts += 1;
          continue;
        }

        if (code === 'network' && networkAttempts < MAX_NETWORK_RETRIES) {
          emit({ type: 'error', code: 'network' });
          await delay(BASE_BACKOFF_MS * 2 ** networkAttempts);
          networkAttempts += 1;
          continue;
        }

        // The silent-retry contract covers unavailable-id retry attempts only;
        // exhausting MAX_ID_RETRIES (or a non-retryable/non-network error) is a
        // genuine failure and is deliberately surfaced here, not swallowed.
        emit({ type: 'error', code });
        throw error;
      }
    }
  }

  function attachPeer(created: Peer): void {
    peer = created;

    created.on('error', (error: PeerError) => {
      emit({ type: 'error', code: mapErrorCode(error.type) });
    });

    created.on('disconnected', () => {
      emit({ type: 'disconnected' });
      if (!closed && !created.destroyed) created.reconnect();
    });
  }

  return {
    async host(): Promise<string> {
      const created = await createPeer();
      if (closed) {
        // Torn down while the peer was still opening: don't revive it.
        created.destroy();
        throw new Error('transport closed');
      }
      attachPeer(created);
      created.on('connection', (conn) => {
        // Last phone in wins; an earlier stale connection is dropped.
        connection?.close();
        attachConnection(conn, false);
      });
      emit({ type: 'open', peerId: created.id });
      return created.id;
    },

    async join(peerId: string): Promise<void> {
      const created = await createPeer();
      if (closed) {
        // Torn down while the peer was still opening: don't revive it.
        created.destroy();
        throw new Error('transport closed');
      }
      attachPeer(created);
      emit({ type: 'open', peerId: created.id });
      attachConnection(created.connect(peerId, { reliable: true }), true);
    },

    send(message: WireMessage): void {
      if (closed) return;
      connection?.send(message);
    },

    subscribe(listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    close(): void {
      closed = true;
      connection?.close();
      connection = null;
      peer?.destroy();
      peer = null;
      listeners.clear();
    },
  };
}
