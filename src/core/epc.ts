import { formatEuros, type Payment } from './payment';

/** EPC field length limits, in characters. */
const MAX = {
  name: 70,
  iban: 34,
  purposeCode: 4,
  structuredReference: 35,
  unstructured: 140,
} as const;

/** EPC permits 0.01 to 999999999.99, expressed here in integer cents. */
const MIN_AMOUNT_CENTS = 1;
const MAX_AMOUNT_CENTS = 99999999999;

export type EpcBuildFailure = 'amount-out-of-range' | 'missing-iban';

export type EpcBuildResult =
  | { ok: true; payload: string }
  | { ok: false; reason: EpcBuildFailure };

const ISO_11649 = /^RF\d{2}/;

/**
 * True for ISO 11649 creditor references only. Slovenian SI-model references
 * are not ISO 11649 and must not go in the structured EPC field.
 */
export function isIso11649Reference(reference: string): boolean {
  return ISO_11649.test(reference.replace(/\s+/g, '').toUpperCase());
}

function truncate(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/**
 * Build the 12-line EPC (BCD/SCT) payload.
 *
 * Version 002 is load-bearing: UPN carries no BIC, and only 002 permits the
 * BIC field (line 5) to be empty.
 */
export function buildEpcPayload(payment: Payment): EpcBuildResult {
  if (
    !Number.isInteger(payment.amountCents) ||
    payment.amountCents < MIN_AMOUNT_CENTS ||
    payment.amountCents > MAX_AMOUNT_CENTS
  ) {
    return { ok: false, reason: 'amount-out-of-range' };
  }

  const iban = truncate(payment.iban, MAX.iban);
  if (!iban) return { ok: false, reason: 'missing-iban' };

  const reference = payment.reference.trim();
  const structured = isIso11649Reference(reference) ? reference : '';
  // An SI-model reference leads the unstructured field: the creditor
  // reconciles on it, and line 11 is the one that gets cut at 140.
  const unstructuredParts: string[] = structured ? [] : [reference];
  unstructuredParts.push(payment.remittance.trim());

  const payload = [
    'BCD',
    '002',
    '1',
    'SCT',
    '', // BIC — always empty, UPN does not carry one
    truncate(payment.name, MAX.name),
    iban,
    `EUR${formatEuros(payment.amountCents)}`,
    truncate(payment.purposeCode, MAX.purposeCode),
    truncate(structured, MAX.structuredReference),
    truncate(unstructuredParts.filter(Boolean).join(' '), MAX.unstructured),
    '', // beneficiary-to-originator information
  ].join('\n');

  return { ok: true, payload };
}
