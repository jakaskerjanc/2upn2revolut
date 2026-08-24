const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 10;

/** Peer IDs are namespaced because the public broker is shared with every other app. */
export const PEER_ID_PATTERN = /^upn-[a-z0-9]{10}$/;

export function generatePeerId(): string {
  const bytes = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(bytes);
  let id = 'upn-';
  for (const byte of bytes) {
    // charAt, not [], because noUncheckedIndexedAccess widens [] to string | undefined.
    id += ALPHABET.charAt(byte % ALPHABET.length);
  }
  return id;
}

export function isValidPeerId(id: string): boolean {
  return PEER_ID_PATTERN.test(id);
}
