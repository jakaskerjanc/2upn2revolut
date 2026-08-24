import { decode as decodeUpnQr } from 'upnqr';
import { centsFromEuros, type Payment } from './payment';

export type UpnDecodeFailure =
  /** Not a UPN QR at all — a URL, a wifi code, anything. Keep scanning. */
  | 'not-upn'
  /** Claims to be a UPN QR but is invalid: checksum, amount, or length. Tell the user. */
  | 'malformed';

export type UpnDecodeResult =
  | { ok: true; payment: Payment }
  | { ok: false; reason: UpnDecodeFailure };

const UPN_PREFIX = 'UPNQR\n';

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Decode a raw QR payload into a Payment.
 *
 * Returns a discriminated result rather than throwing so the scanner can tell
 * "this QR is not a UPN QR, keep scanning" from "this UPN QR is broken, say so".
 */
export function decodeUpn(payload: string): UpnDecodeResult {
  if (!payload.startsWith(UPN_PREFIX)) {
    return { ok: false, reason: 'not-upn' };
  }

  let raw: Record<string, unknown>;
  try {
    raw = decodeUpnQr(payload);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const znesek = raw['znesek'];
  if (typeof znesek !== 'number' || !Number.isFinite(znesek)) {
    return { ok: false, reason: 'malformed' };
  }

  return {
    ok: true,
    payment: {
      name: str(raw['ime_prejemnika']),
      iban: str(raw['IBAN_prejemnika']),
      amountCents: centsFromEuros(znesek),
      purposeCode: str(raw['koda_namena']),
      reference: str(raw['referenca_prejemnika']),
      remittance: str(raw['namen_placila']),
    },
  };
}
