import type { AppState } from './store';

export type PhoneStep = 'scan' | 'pay';

/**
 * The phone derives its step from local state alone: nothing scanned yet means
 * `scan`, a scanned payment means `pay`.
 */
export function phoneStep(state: AppState): PhoneStep {
  return state.payments.length > 0 ? 'pay' : 'scan';
}
