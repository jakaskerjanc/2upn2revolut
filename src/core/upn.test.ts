import { describe, expect, it } from 'vitest';
import { decodeUpn } from './upn';

const SI_REFERENCE_BILL =
  'UPNQR\n\n\n\n\nJanez Novak\nUlica 1\n1000 Ljubljana\n00000012345\n\n\nOTHR\n' +
  'Plačilo računa\n\nSI56020170014356205\nSI00 1234-5678\nTelekom Slovenije d.d.\n' +
  'Cigaletova 15\n1000 Ljubljana\n167\n';

const RF_REFERENCE_BILL =
  'UPNQR\n\n\n\n\n\n\n\n00000000500\n\n\nGDSV\nRacun 42\n\nSI56020170014356205\n' +
  'RF18539007547034\nIme Prejemnika\nUlica 2\n2000 Maribor\n115\n';

describe('decodeUpn', () => {
  it('maps a valid UPN payload onto Payment', () => {
    const result = decodeUpn(SI_REFERENCE_BILL);
    expect(result).toEqual({
      ok: true,
      payment: {
        name: 'Telekom Slovenije d.d.',
        iban: 'SI56020170014356205',
        amountCents: 12345,
        purposeCode: 'OTHR',
        reference: 'SI00 1234-5678',
        remittance: 'Plačilo računa',
      },
    });
  });

  it('converts the euro float upnqr returns into integer cents', () => {
    const result = decodeUpn(RF_REFERENCE_BILL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payment.amountCents).toBe(500);
    expect(result.payment.reference).toBe('RF18539007547034');
  });

  it('reports a non-UPN string as not-upn so the scanner keeps scanning', () => {
    expect(decodeUpn('https://example.com')).toEqual({ ok: false, reason: 'not-upn' });
    expect(decodeUpn('')).toEqual({ ok: false, reason: 'not-upn' });
  });

  it('reports a bad checksum as malformed', () => {
    const corrupted = RF_REFERENCE_BILL.replace('\n115\n', '\n999\n');
    expect(decodeUpn(corrupted)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('reports a payload over 411 characters as malformed', () => {
    const tooLong = 'UPNQR\n' + 'x'.repeat(420);
    expect(decodeUpn(tooLong)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('reports a UPN payload with an invalid amount field as malformed', () => {
    const badAmount = SI_REFERENCE_BILL.replace('00000012345', 'not-a-num');
    expect(decodeUpn(badAmount)).toEqual({ ok: false, reason: 'malformed' });
  });
});
