export type Device = 'phone' | 'desktop';

export interface DeviceEnv {
  /** Raw `?device=` value, or null when absent. */
  override: string | null;
  /** matchMedia('(pointer: coarse)').matches */
  coarsePointer: boolean;
  /** navigator.maxTouchPoints > 0 */
  hasTouch: boolean;
  /** navigator.userAgent */
  ua: string;
}

const MOBILE_UA = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i;

/**
 * Decide phone vs desktop from already-gathered signals. Pure so it can be
 * unit-tested under the Node test env. An explicit `?device=` override wins;
 * otherwise a mobile UA or a coarse-pointer touch screen means phone.
 */
export function classifyDevice(env: DeviceEnv): Device {
  if (env.override === 'phone' || env.override === 'desktop') return env.override;
  if (MOBILE_UA.test(env.ua)) return 'phone';
  if (env.coarsePointer && env.hasTouch) return 'phone';
  return 'desktop';
}

/** Gather live browser signals and classify. Safe to call once at startup. */
export function detectDevice(): Device {
  const params = new URLSearchParams(window.location.search);
  return classifyDevice({
    override: params.get('device'),
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    hasTouch: navigator.maxTouchPoints > 0,
    ua: navigator.userAgent,
  });
}
