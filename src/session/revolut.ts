export const DEFAULT_REVOLUT_LINK = 'revolut://app/payments';

/** Shown instead of the button when the deep link demonstrably did not launch. */
export const REVOLUT_WEB_URL = 'https://www.revolut.com/';

/** How long to wait for the page to background before calling the launch failed. */
const LAUNCH_TIMEOUT_MS = 1500;

const ALLOWED_SCHEME = /^(revolut:|https:)/i;

/**
 * Resolve the deep link: `?revolut=` beats VITE_REVOLUT_DEEPLINK beats the
 * bare scheme. An override that is not a revolut: or https: URL is discarded,
 * so a crafted pairing link cannot turn this button into a javascript: sink.
 */
export function resolveRevolutLink(search: string, envLink: string | undefined): string {
  const override = new URLSearchParams(search).get('revolut')?.trim();
  for (const candidate of [override, envLink?.trim()]) {
    if (!candidate) continue;
    if (!ALLOWED_SCHEME.test(candidate)) continue;
    try {
      new URL(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return DEFAULT_REVOLUT_LINK;
}

/**
 * Follow the deep link and report whether the app actually took over.
 *
 * MUST be called synchronously from a real tap: iOS blocks programmatic
 * navigation to custom schemes. An unregistered scheme fails silently on
 * Android and raises a system dialog on iOS, so the only reliable signal is
 * whether the page backgrounded.
 */
export function openRevolut(link: string, onFailure: () => void): void {
  let settled = false;

  const finish = (failed: boolean): void => {
    if (settled) return;
    settled = true;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.clearTimeout(timer);
    if (failed) onFailure();
  };

  function onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') finish(false);
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  const timer = window.setTimeout(() => finish(true), LAUNCH_TIMEOUT_MS);

  window.location.href = link;
}
