import type { AppState } from './store';

export type HostStep = 'pair' | 'waiting' | 'display';
export type PhoneStep = 'connect' | 'scan' | 'pay';

/**
 * Each device derives its own step from local state. There is no step-sync
 * message, so the two sides cannot disagree about a step they were told about
 * separately — they can only disagree about reality, which they observe directly.
 */
export function hostStep(state: AppState): HostStep {
  if (state.payments.length > 0) return 'display';
  return state.connected ? 'waiting' : 'pair';
}

export function phoneStep(state: AppState): PhoneStep {
  if (!state.connected) return 'connect';
  return state.payments.length > 0 ? 'pay' : 'scan';
}
