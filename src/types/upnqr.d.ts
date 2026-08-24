declare module 'upnqr' {
  export class UPNQRError extends Error {
    name: 'UPNQRError';
  }
  export function decode(code: string): Record<string, unknown>;
  export function encode(upn: Record<string, unknown>): string;
}
