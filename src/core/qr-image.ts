import QRCode from 'qrcode';

/**
 * Render a value to a PNG data URL entirely in-process — same encode options
 * as the on-screen Qr (EC level M, margin 4) so the saved image and any
 * displayed code are identical. No network, no canvas dependency.
 */
export function qrPngDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 512,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

/** Decode a base64 PNG data URL into a Blob for sharing/downloading. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}
