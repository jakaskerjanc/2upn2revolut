export type SaveStrategy = 'share' | 'download';

export interface ShareCapableNavigator {
  canShare?(data: { files?: File[] }): boolean;
  share?(data: { files?: File[]; title?: string; text?: string }): Promise<void>;
}

/**
 * Prefer the native share sheet: on a phone it offers "Save Image" (→ Photos,
 * where Revolut can import from) or sharing straight into Revolut. Fall back to
 * a plain download when Web Share with files is unavailable or refuses the file.
 */
export function pickSaveStrategy(nav: ShareCapableNavigator, file: File): SaveStrategy {
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
    return 'share';
  }
  return 'download';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download has grabbed the URL first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Save the QR image. MUST run synchronously off a user gesture — iOS blocks
 * both share() and programmatic downloads otherwise. Returns which path ran so
 * the caller can tailor its follow-up instruction. A cancelled share throws
 * AbortError, which the caller treats as "nothing to do".
 */
export async function saveQrImage(blob: Blob, filename: string): Promise<SaveStrategy> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as ShareCapableNavigator;
  if (pickSaveStrategy(nav, file) === 'share') {
    await nav.share!({ files: [file], title: filename });
    return 'share';
  }
  downloadBlob(blob, filename);
  return 'download';
}
