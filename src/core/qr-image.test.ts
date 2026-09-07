import { describe, expect, it } from 'vitest';
import { dataUrlToBlob, qrPngDataUrl } from './qr-image';

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
