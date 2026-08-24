import { describe, expect, it } from 'vitest';
import { buildEpcPayload, isIso11649Reference } from './epc';
import type { Payment } from './payment';

const base: Payment = {
  name: 'Telekom Slovenije d.d.',
  iban: 'SI56020170014356205',
  amountCents: 12345,
  purposeCode: 'OTHR',
  reference: 'SI00 1234-5678',
  remittance: 'Plačilo računa',
};

function lines(payment: Payment): string[] {
  const result = buildEpcPayload(payment);
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
  return result.payload.split('\n');
}

describe('buildEpcPayload structure', () => {
  it('emits exactly 12 lines in the BCD/SCT order', () => {
    const out = lines(base);
    expect(out).toHaveLength(12);
    expect(out[0]).toBe('BCD');
    expect(out[1]).toBe('002');
    expect(out[2]).toBe('1');
    expect(out[3]).toBe('SCT');
    expect(out[4]).toBe('');
    expect(out[5]).toBe('Telekom Slovenije d.d.');
    expect(out[6]).toBe('SI56020170014356205');
    expect(out[7]).toBe('EUR123.45');
    expect(out[8]).toBe('OTHR');
    expect(out[11]).toBe('');
  });

  it('keeps version 002 and the empty BIC line, which UPN requires', () => {
    const out = lines({ ...base, name: 'X' });
    expect(out[1]).toBe('002');
    expect(out[4]).toBe('');
  });
});

describe('reference routing', () => {
  it('recognises ISO 11649 references only', () => {
    expect(isIso11649Reference('RF18539007547034')).toBe(true);
    expect(isIso11649Reference('RF18 5390 0754 7034')).toBe(true);
    expect(isIso11649Reference('rf18539007547034')).toBe(true);
    expect(isIso11649Reference('SI00 1234-5678')).toBe(false);
    expect(isIso11649Reference('SI12 1234')).toBe(false);
    expect(isIso11649Reference('RFAB1234')).toBe(false);
    expect(isIso11649Reference('')).toBe(false);
  });

  it('puts an RF reference in the structured field and leaves field 11 to the remittance', () => {
    const out = lines({ ...base, reference: 'RF18539007547034' });
    expect(out[9]).toBe('RF18539007547034');
    expect(out[10]).toBe('Plačilo računa');
  });

  it('puts an SI reference in the unstructured field, ahead of the remittance', () => {
    const out = lines(base);
    expect(out[9]).toBe('');
    expect(out[10]).toBe('SI00 1234-5678 Plačilo računa');
  });

  it('omits the separator when there is no remittance', () => {
    const out = lines({ ...base, remittance: '' });
    expect(out[10]).toBe('SI00 1234-5678');
  });

  it('leaves both reference fields empty when the bill carries no reference', () => {
    const out = lines({ ...base, reference: '' });
    expect(out[9]).toBe('');
    expect(out[10]).toBe('Plačilo računa');
  });

  it('normalizes a spaced RF reference to canonical form in the structured field', () => {
    const out = lines({ ...base, reference: 'RF18 5390 0754 7034' });
    expect(out[9]).toBe('RF18539007547034');
    expect(out[10]).toBe('Plačilo računa');
  });

  it('normalizes a lowercase RF reference to canonical form in the structured field', () => {
    const out = lines({ ...base, reference: 'rf18539007547034' });
    expect(out[9]).toBe('RF18539007547034');
    expect(out[10]).toBe('Plačilo računa');
  });
});

describe('field limits', () => {
  it('truncates the name at 70 characters', () => {
    const out = lines({ ...base, name: 'N'.repeat(100) });
    expect(out[5]).toBe('N'.repeat(70));
  });

  it('truncates the IBAN at 34 characters', () => {
    const out = lines({ ...base, iban: 'I'.repeat(40) });
    expect(out[6]).toBe('I'.repeat(34));
  });

  it('truncates the purpose code at 4 characters', () => {
    const out = lines({ ...base, purposeCode: 'OTHERS' });
    expect(out[8]).toBe('OTHE');
  });

  it('truncates a structured reference at 35 characters', () => {
    const reference = 'RF18' + '9'.repeat(40);
    const out = lines({ ...base, reference });
    expect(out[9]).toBe(reference.slice(0, 35));
  });

  it('truncates the unstructured field at 140 characters', () => {
    const out = lines({ ...base, reference: '', remittance: 'R'.repeat(200) });
    expect(out[10]).toBe('R'.repeat(140));
  });

  it('never lets a long remittance truncate the reference out of field 11', () => {
    const out = lines({ ...base, remittance: 'R'.repeat(200) });
    expect(out[10]).toHaveLength(140);
    expect(out[10]!.startsWith('SI00 1234-5678 ')).toBe(true);
  });
});

describe('amount bounds', () => {
  it('accepts the EPC minimum and maximum', () => {
    expect(lines({ ...base, amountCents: 1 })[7]).toBe('EUR0.01');
    expect(lines({ ...base, amountCents: 99999999999 })[7]).toBe('EUR999999999.99');
  });

  it.each([0, -1, 100000000000])('rejects the out-of-range amount %s cents', (amountCents) => {
    expect(buildEpcPayload({ ...base, amountCents })).toEqual({
      ok: false,
      reason: 'amount-out-of-range',
    });
  });

  it('rejects a non-integer amount', () => {
    expect(buildEpcPayload({ ...base, amountCents: 12.5 })).toEqual({
      ok: false,
      reason: 'amount-out-of-range',
    });
  });
});

describe('required fields', () => {
  it('rejects a payment with no IBAN', () => {
    expect(buildEpcPayload({ ...base, iban: '   ' })).toEqual({
      ok: false,
      reason: 'missing-iban',
    });
  });
});
