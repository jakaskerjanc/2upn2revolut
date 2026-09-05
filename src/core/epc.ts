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
 * ISO 11649's electronic representation has no separators and is uppercase.
 * Used both to detect an ISO 11649 reference and to normalize one before it
 * is written into the structured EPC field, so the two paths cannot drift.
 */
function normalizeIso11649(reference: string): string {
  return reference.replace(/\s+/g, '').toUpperCase();
}

/**
 * True for ISO 11649 creditor references only. Slovenian SI-model references
 * are not ISO 11649 and must not go in the structured EPC field.
 */
export function isIso11649Reference(reference: string): boolean {
  return ISO_11649.test(normalizeIso11649(reference));
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
  // Field 10 carries the canonical ISO 11649 form (no separators, uppercase).
  // Field 11 keeps an SI-model reference verbatim — it's free text there and
  // the bill's own formatting is what the creditor reads.
  const structured = isIso11649Reference(reference) ? normalizeIso11649(reference) : '';
  // Reference and remittance never share a field: whichever reference exists
  // takes its field alone, and remittance only appears when there is no reference.
  const unstructured = structured ? '' : reference || payment.remittance.trim();

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
    truncate(unstructured, MAX.unstructured),
    '', // beneficiary-to-originator information
  ].join('\n');

  return { ok: true, payload };
}
