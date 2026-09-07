import { buildEpcPayload } from '../core/epc';
import { decodeUpn } from '../core/upn';
import type { TranslationKey } from '../i18n';
import type { SentPayment } from './store';

export type IngestFailureReason = 'not-upn' | 'malformed' | 'epc-amount' | 'epc-iban';

export type IngestResult =
  | { ok: true; entry: SentPayment }
  | { ok: false; reason: IngestFailureReason };

/**
 * Decode a raw QR payload into a ready-to-store payment: UPN decode, then EPC
 * build. This is the one conversion path both the phone camera and the desktop
 * image upload share. It never touches the store — callers decide what each
 * failure means (the viewfinder stays silent on 'not-upn'; desktop reports it).
 */
export function ingestUpn(text: string): IngestResult {
  const decoded = decodeUpn(text);
  if (!decoded.ok) return { ok: false, reason: decoded.reason };

  const epc = buildEpcPayload(decoded.payment);
  if (!epc.ok) {
    return { ok: false, reason: epc.reason === 'missing-iban' ? 'epc-iban' : 'epc-amount' };
  }

  return {
    ok: true,
    entry: { id: crypto.randomUUID(), epc: epc.payload, payment: decoded.payment },
  };
}

const ERROR_KEYS: Record<IngestFailureReason, TranslationKey> = {
  'not-upn': 'error.notUpn',
  malformed: 'error.upnMalformed',
  'epc-amount': 'error.epcAmount',
  'epc-iban': 'error.epcIban',
};

/** Map a failure reason to the message key a UI surfaces for it. */
export function ingestErrorKey(reason: IngestFailureReason): TranslationKey {
  return ERROR_KEYS[reason];
}
