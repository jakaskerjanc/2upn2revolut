import { useSyncExternalStore } from 'react';
import type { Payment } from '../core/payment';
import { loadLanguage, saveLanguage, type Lang, type TranslationKey } from '../i18n';

export interface SentPayment {
  id: string;
  epc: string;
  payment: Payment;
}

export type CameraError = 'denied' | 'not-found' | 'insecure-context' | 'unknown';

export interface AppState {
  lang: Lang;
  /** Newest first, capped at five. In memory only — never persisted. */
  payments: SentPayment[];
  cameraError: CameraError | null;
  /**
   * A one-shot message for the view to toast. Held as a translation key rather
   * than text so `session/` never has to reach for a component or a dictionary.
   */
  notice: TranslationKey | null;
}

const MAX_PAYMENTS = 5;

export function initialState(): AppState {
  return { lang: 'sl', payments: [], cameraError: null, notice: null };
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

export function addPayment(entry: SentPayment): void {
  set({ payments: [entry, ...state.payments].slice(0, MAX_PAYMENTS) });
}

/** Drop the current payment so the step machine returns to `scan`. */
export function resetPayments(): void {
  set({ payments: [] });
}

export function setCameraError(cameraError: CameraError | null): void {
  set({ cameraError });
}

export function setNotice(notice: TranslationKey | null): void {
  set({ notice });
}

/** The payment to act on: the newest one, or null when none scanned yet. */
export function currentPayment(current: AppState): SentPayment | null {
  return current.payments[0] ?? null;
}
