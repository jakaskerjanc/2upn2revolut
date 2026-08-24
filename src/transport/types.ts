import type { WireMessage } from './protocol';

export type TransportErrorCode =
  /** The other page is closed or the id is stale. */
  | 'peer-unavailable'
  /** No WebRTC in this browser. */
  | 'browser-incompatible'
  /** Broker unreachable or rate limiting us; a retry is already scheduled. */
  | 'network'
  /** The broker answered, but badly. */
  | 'server-error'
  | 'unknown';

export type TransportEvent =
  | { type: 'open'; peerId: string }
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'message'; message: WireMessage }
  | { type: 'error'; code: TransportErrorCode };

export interface Transport {
  /** Become the host. Resolves with this peer's own id. */
  host(): Promise<string>;
  /** Join an existing host by peer id. */
  join(peerId: string): Promise<void>;
  send(message: WireMessage): void;
  subscribe(listener: (event: TransportEvent) => void): () => void;
  close(): void;
}
