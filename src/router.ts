import { useSyncExternalStore } from 'react';
import { isValidPeerId } from './transport/peer-id';

export type Route = { name: 'host' } | { name: 'phone'; peerId: string };

const PHONE_ROUTE = /^#\/p\/([^/?#]+)/;

export function parseHash(hash: string): Route {
  const match = PHONE_ROUTE.exec(hash);
  const peerId = match?.[1];
  if (peerId && isValidPeerId(peerId)) return { name: 'phone', peerId };
  return { name: 'host' };
}

function subscribeToHash(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

/**
 * Cached so useSyncExternalStore gets a stable snapshot: parseHash allocates a
 * new object each call, which would otherwise loop forever.
 */
let cachedHash = '';
let cachedRoute: Route = { name: 'host' };

function getRouteSnapshot(): Route {
  const hash = window.location.hash;
  if (hash !== cachedHash) {
    cachedHash = hash;
    cachedRoute = parseHash(hash);
  }
  return cachedRoute;
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribeToHash, getRouteSnapshot, () => ({ name: 'host' }));
}
