import { describe, expect, it } from 'vitest';
import { dataUrlToBlob, qrFileName, qrPngDataUrl } from './qr-image';

const EPC = 'BCD\n002\n1\nSCT\n\nAcme d.o.o.\nSI56020170014356205\nEUR12.34\nOTHR\n\nPlačilo\n';

describe('qrPngDataUrl', () => {
  it('returns a PNG data URL for an EPC payload', async () => {
    const url = await qrPngDataUrl(EPC);
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    expect(url.length).toBeGreaterThan(100);
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a PNG data URL into a non-empty image/png blob', async () => {
    const blob = dataUrlToBlob(await qrPngDataUrl(EPC));
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('qrFileName', () => {
  it('names the file amount then recipient', () => {
    expect(qrFileName({ amountCents: 2000, name: 'John Doe' })).toBe('20.00-John-Doe.png');
  });

  it('collapses punctuation in the recipient name into dashes', () => {
    expect(qrFileName({ amountCents: 12345, name: 'Acme d.o.o.' })).toBe('123.45-Acme-d-o-o.png');
  });

  it('drops diacritics from the recipient name', () => {
    expect(qrFileName({ amountCents: 2000, name: 'Žiga Šoštar' })).toBe('20.00-Ziga-Sostar.png');
  });

  it('strips characters that are illegal in filenames', () => {
    expect(qrFileName({ amountCents: 2000, name: 'A/B:C*?"<>|D' })).toBe('20.00-A-B-C-D.png');
  });

  it('falls back to payment when the recipient name is blank', () => {
    expect(qrFileName({ amountCents: 2000, name: '   ' })).toBe('20.00-payment.png');
  });
});
