import { useSyncExternalStore } from 'react';
import type { Payment } from '../core/payment';
import type { TransportErrorCode } from '../transport/types';
import { loadLanguage, saveLanguage, type Lang, type TranslationKey } from '../i18n';

export interface SentPayment {
  id: string;
  epc: string;
  payment: Payment;
}

export type CameraError = 'denied' | 'not-found' | 'insecure-context' | 'unknown';

export interface AppState {
  lang: Lang;
  /** Host: this device's own id. Phone: the host id being joined. */
  peerId: string | null;
  connected: boolean;
  /** Newest first, capped at five. In memory only — never persisted. */
  payments: SentPayment[];
  shownPaymentId: string | null;
  cameraError: CameraError | null;
  transportError: TransportErrorCode | null;
  /**
   * A one-shot message for the view to toast. Held as a translation key rather
   * than text so `session/` never has to reach for a component or a dictionary.
   */
  notice: TranslationKey | null;
}

const MAX_PAYMENTS = 5;

export function initialState(): AppState {
  return {
    lang: 'sl',
    peerId: null,
    connected: false,
    payments: [],
    shownPaymentId: null,
    cameraError: null,
    transportError: null,
    notice: null,
  };
}

let state: AppState = { ...initialState(), lang: loadLanguage() };
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function setLang(lang: Lang): void {
  saveLanguage(lang);
  set({ lang });
}

export function setPeerId(peerId: string | null): void {
  set({ peerId });
}

export function setConnected(connected: boolean): void {
  set({ connected, transportError: connected ? null : state.transportError });
}

export function addPayment(entry: SentPayment): void {
  set({
    payments: [entry, ...state.payments].slice(0, MAX_PAYMENTS),
    shownPaymentId: entry.id,
  });
}

export function showPayment(id: string): void {
  set({ shownPaymentId: id });
}

/** Phone only: drop the sent payment so the step machine returns to `scan`. */
export function resetPayments(): void {
  set({ payments: [], shownPaymentId: null });
}

export function setCameraError(cameraError: CameraError | null): void {
  set({ cameraError });
}

export function setTransportError(transportError: TransportErrorCode | null): void {
  set({ transportError });
}

export function setNotice(notice: TranslationKey | null): void {
  set({ notice });
}

/** The payment the host is currently displaying, or the newest one. */
export function currentPayment(current: AppState): SentPayment | null {
  if (current.payments.length === 0) return null;
  const shown = current.payments.find((entry) => entry.id === current.shownPaymentId);
  return shown ?? current.payments[0] ?? null;
}
