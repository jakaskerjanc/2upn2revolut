import { describe, expect, it } from 'vitest';
import { ingestErrorKey, ingestUpn, type IngestFailureReason } from './ingest';

const SI_REFERENCE_BILL =
  'UPNQR\n\n\n\n\nJanez Novak\nUlica 1\n1000 Ljubljana\n00000012345\n\n\nOTHR\n' +
  'Plačilo računa\n\nSI56020170014356205\nSI00 1234-5678\nTelekom Slovenije d.d.\n' +
  'Cigaletova 15\n1000 Ljubljana\n167\n';

describe('ingestUpn', () => {
  it('converts a valid UPN payload into a stored payment entry', () => {
    const result = ingestUpn(SI_REFERENCE_BILL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.payment.iban).toBe('SI56020170014356205');
    expect(result.entry.payment.amountCents).toBe(12345);
    expect(result.entry.epc.startsWith('BCD\n')).toBe(true);
    expect(typeof result.entry.id).toBe('string');
    expect(result.entry.id.length).toBeGreaterThan(0);
  });

  it('gives each entry a distinct id', () => {
    const a = ingestUpn(SI_REFERENCE_BILL);
    const b = ingestUpn(SI_REFERENCE_BILL);
    expect(a.ok && b.ok && a.entry.id !== b.entry.id).toBe(true);
  });

  it('reports a non-UPN string as not-upn', () => {
    expect(ingestUpn('https://example.com')).toEqual({ ok: false, reason: 'not-upn' });
  });

  it('reports a corrupted UPN payload as malformed', () => {
    const corrupted = SI_REFERENCE_BILL.replace('\n167\n', '\n999\n');
    expect(ingestUpn(corrupted)).toEqual({ ok: false, reason: 'malformed' });
  });
});

describe('ingestErrorKey', () => {
  it('maps every failure reason to a translation key', () => {
    const cases: Record<IngestFailureReason, string> = {
      'not-upn': 'error.notUpn',
      malformed: 'error.upnMalformed',
      'epc-amount': 'error.epcAmount',
      'epc-iban': 'error.epcIban',
    };
    for (const [reason, key] of Object.entries(cases)) {
      expect(ingestErrorKey(reason as IngestFailureReason)).toBe(key);
    }
  });
});
