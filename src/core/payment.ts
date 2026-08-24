/** A payment as this app understands it. Amount is always integer cents. */
export interface Payment {
  /** Creditor name. */
  name: string;
  iban: string;
  /** Integer cents. 12345 === EUR 123.45. */
  amountCents: number;
  /** AT-44 purpose code, 4 characters. */
  purposeCode: string;
  /** Verbatim from the bill, e.g. "SI00 1234-5678" or "RF18 5390". */
  reference: string;
  /** Free-text payment purpose. */
  remittance: string;
}

/**
 * Convert a euro amount to integer cents, rounding the half cent up.
 *
 * The `toFixed(4)` pass exists because `1.005 * 100` is `100.49999999999999`
 * in binary floating point, which `Math.round` would take down to 100. Fixing
 * to four decimals first collapses that error before rounding.
 */
export function centsFromEuros(euros: number): number {
  if (!Number.isFinite(euros)) return 0;
  return Math.round(Number((euros * 100).toFixed(4)));
}

/** Render integer cents as a plain decimal string, e.g. 12345 -> "123.45". */
export function formatEuros(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}
