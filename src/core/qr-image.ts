import QRCode from 'qrcode';
import { formatEuros, type Payment } from './payment';

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

/**
 * Name the saved QR image after the payment it encodes, e.g.
 * "20.00-John-Doe.png" — spaces and punctuation in the recipient name collapse
 * into single dashes and diacritics are folded to ASCII ("Žiga" -> "Ziga"), so
 * the file is recognizable in the camera roll instead of another "qr code.png".
 */
export function qrFileName(payment: Pick<Payment, 'amountCents' | 'name'>): string {
  const recipient =
    payment.name
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'payment';
  return `${formatEuros(payment.amountCents)}-${recipient}.png`;
}

/** Decode a base64 PNG data URL into a Blob for sharing/downloading. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}
