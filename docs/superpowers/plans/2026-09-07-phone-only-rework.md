# Phone-Only Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn 2upn2revolut into a single-device, offline phone tool: scan the UPN QR, convert to EPC, render the EPC QR to an image, and save/share it for Revolut to import — deleting all device-to-device networking.

**Architecture:** `App` detects the device once and renders either `PhoneView` (scan → convert → save) or `DesktopView` (handoff message + a QR of the app URL). The whole scan → EPC-string → QR-image → save chain runs client-side; the PeerJS transport, host session, and hash routing are removed.

**Tech Stack:** React 19, Vite 7, TypeScript, Tailwind v4, `qrcode` (already a dependency), `@zxing/browser` (scanner), Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-07-phone-only-rework-design.md`

## Global Constraints

- **No external APIs / no network.** QR generation, PNG encoding, and saving are all local browser/JS calls. The only prior external dependency (PeerJS broker) is being deleted.
- **No new dependencies.** Reuse `qrcode` and built-in browser APIs.
- **Vitest environment is `node`** (`vite.config.ts:23`). New unit tests must run under Node — no DOM/canvas. Test pure functions with injected inputs; do not write component/DOM tests (the repo tests logic only, never components).
- **Copy is bilingual.** Every user-facing string is a translation key present in BOTH `src/i18n/sl.ts` and `src/i18n/en.ts`; Slovenian is the default. `i18n.test.ts` enforces key parity and no-empty-strings.
- **Node >= 22**, pnpm. Commands: `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Camera scanner and UPN→EPC domain logic (`core/upn`, `core/epc`, `core/payment`, `session/scanner.ts`) are reused unchanged.**

---

## File Structure

**New:**
- `src/device.ts` — device classification (pure `classifyDevice` + effectful `detectDevice`).
- `src/device.test.ts` — classification cases.
- `src/core/qr-image.ts` — `qrPngDataUrl(value)` + `dataUrlToBlob(dataUrl)`, local PNG generation.
- `src/core/qr-image.test.ts` — data-URL and blob assertions.
- `src/session/save.ts` — `pickSaveStrategy` (pure) + `saveQrImage` (Share/download side effect).
- `src/session/save.test.ts` — strategy selection.
- `src/views/DesktopView.tsx` — handoff message + app-URL QR.

**Modified:**
- `src/session/store.ts` — drop connection/transport state.
- `src/session/steps.ts` + `src/session/steps.test.ts` — phone-only 2-step machine.
- `src/session/phone-session.ts` — remove transport; local decode→store.
- `src/views/PhoneView.tsx` — no peerId/connect step; save flow on pay step.
- `src/App.tsx` — device branch instead of hash route.
- `src/components/Stepper.tsx` — 2 steps (Scan → Pay).
- `src/i18n/en.ts`, `src/i18n/sl.ts` — add desktop/save keys, remove pairing/transport keys.
- `README.md` — rewrite for the single-device model.
- `package.json` — remove `peerjs`.

**Deleted:**
- `src/transport/` (all files + tests), `src/session/host-session.ts`, `src/views/HostView.tsx`, `src/router.ts`, `src/router.test.ts`.

**Unchanged:** `src/core/{upn,epc,payment}.ts` (+ tests), `src/session/scanner.ts`, `src/session/revolut.ts` (+ `revolut.test.ts`), `src/components/{QrCode,PaymentSummary,LanguageToggle,AppShell}.tsx`, `src/components/ui/*`, `src/session/useT.ts`.

> Note (spec deviation, intentional): the spec suggested `QrCode.tsx` consume a shared `qr-image` helper. Because display uses a live `<canvas>` (browser-only) and the save path needs a data-URL/blob that is testable under the Node test env, `QrCode.tsx` stays on its existing `toCanvas` path and `qr-image.ts` serves only the save flow. Both use the same encode options (EC level `M`, margin `4`) so the rendered codes match.

---

### Task 1: Device detection

**Files:**
- Create: `src/device.ts`
- Test: `src/device.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Device = 'phone' | 'desktop'`
  - `interface DeviceEnv { override: string | null; coarsePointer: boolean; hasTouch: boolean; ua: string }`
  - `function classifyDevice(env: DeviceEnv): Device`
  - `function detectDevice(): Device` (reads `window`/`navigator`/`matchMedia`)

- [ ] **Step 1: Write the failing test**

```ts
// src/device.test.ts
import { describe, expect, it } from 'vitest';
import { classifyDevice, type DeviceEnv } from './device';

const base: DeviceEnv = { override: null, coarsePointer: false, hasTouch: false, ua: '' };

describe('classifyDevice', () => {
  it('honours an explicit phone override', () => {
    expect(classifyDevice({ ...base, override: 'phone', ua: 'Mozilla/5.0 (Windows NT)' })).toBe('phone');
  });

  it('honours an explicit desktop override even on a phone UA', () => {
    expect(classifyDevice({ ...base, override: 'desktop', ua: 'iPhone', coarsePointer: true, hasTouch: true })).toBe('desktop');
  });

  it('ignores an unknown override value', () => {
    expect(classifyDevice({ ...base, override: 'watch', coarsePointer: true, hasTouch: true, ua: 'Android' })).toBe('phone');
  });

  it('treats a mobile user-agent as a phone', () => {
    expect(classifyDevice({ ...base, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe('phone');
  });

  it('treats a coarse-pointer touch device as a phone', () => {
    expect(classifyDevice({ ...base, coarsePointer: true, hasTouch: true, ua: 'Mozilla/5.0' })).toBe('phone');
  });

  it('treats a fine-pointer no-touch device as desktop', () => {
    expect(classifyDevice({ ...base, coarsePointer: false, hasTouch: false, ua: 'Mozilla/5.0 (Windows NT 10.0)' })).toBe('desktop');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/device.test.ts`
Expected: FAIL — cannot find module `./device` / `classifyDevice` is not a function.

- [ ] **Step 3: Write the implementation**

```ts
// src/device.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/device.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm typecheck
git add src/device.ts src/device.test.ts
git commit -m "feat: device detection (phone vs desktop) with ?device override"
```

---

### Task 2: Local QR image generation

**Files:**
- Create: `src/core/qr-image.ts`
- Test: `src/core/qr-image.test.ts`

**Interfaces:**
- Consumes: `qrcode` package (already installed; see `src/components/QrCode.tsx` for the option set).
- Produces:
  - `function qrPngDataUrl(value: string): Promise<string>` — a `data:image/png;base64,…` string.
  - `function dataUrlToBlob(dataUrl: string): Blob` — an `image/png` Blob.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/qr-image.test.ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/core/qr-image.test.ts`
Expected: FAIL — cannot find module `./qr-image`.

- [ ] **Step 3: Write the implementation**

`QRCode.toDataURL` works in both Node and the browser (its own PNG encoder in Node, canvas in the browser), so it is testable under the Node env. `atob`, `Uint8Array`, and `Blob` are Node 22 globals.

```ts
// src/core/qr-image.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/core/qr-image.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm typecheck
git add src/core/qr-image.ts src/core/qr-image.test.ts
git commit -m "feat: local EPC-QR PNG generation (data URL + blob)"
```

---

### Task 3: Save / share helper

**Files:**
- Create: `src/session/save.ts`
- Test: `src/session/save.test.ts`

**Interfaces:**
- Consumes: `Blob`/`File` (globals).
- Produces:
  - `type SaveStrategy = 'share' | 'download'`
  - `interface ShareCapableNavigator { canShare?(data: { files?: File[] }): boolean; share?(data: { files?: File[]; title?: string; text?: string }): Promise<void> }`
  - `function pickSaveStrategy(nav: ShareCapableNavigator, file: File): SaveStrategy`
  - `function saveQrImage(blob: Blob, filename: string): Promise<SaveStrategy>` (must be called from a user-gesture handler)

- [ ] **Step 1: Write the failing test**

```ts
// src/session/save.test.ts
import { describe, expect, it } from 'vitest';
import { pickSaveStrategy, type ShareCapableNavigator } from './save';

const file = new File([new Uint8Array([1, 2, 3])], 'epc.png', { type: 'image/png' });

describe('pickSaveStrategy', () => {
  it('shares when the navigator can share the file', () => {
    const nav: ShareCapableNavigator = { canShare: () => true, share: async () => {} };
    expect(pickSaveStrategy(nav, file)).toBe('share');
  });

  it('downloads when share is missing', () => {
    const nav: ShareCapableNavigator = { canShare: () => true };
    expect(pickSaveStrategy(nav, file)).toBe('download');
  });

  it('downloads when canShare rejects the file', () => {
    const nav: ShareCapableNavigator = { canShare: () => false, share: async () => {} };
    expect(pickSaveStrategy(nav, file)).toBe('download');
  });

  it('downloads when neither API exists', () => {
    expect(pickSaveStrategy({}, file)).toBe('download');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/session/save.test.ts`
Expected: FAIL — cannot find module `./save`.

- [ ] **Step 3: Write the implementation**

```ts
// src/session/save.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/session/save.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm typecheck
git add src/session/save.ts src/session/save.test.ts
git commit -m "feat: save-QR helper (Web Share first, download fallback)"
```

---

### Task 4: Flip to the phone-only architecture

This is the atomic switch: it rewrites the session state, step machine, phone session, both views, the app shell wiring, and the copy, then deletes the transport/host/router code and the `peerjs` dependency. It is one commit because removing the store's transport setters breaks `host-session.ts` and the deleted modules the same instant. The tree must end green.

**Files:**
- Modify: `src/session/store.ts`, `src/session/steps.ts`, `src/session/steps.test.ts`, `src/session/phone-session.ts`, `src/views/PhoneView.tsx`, `src/App.tsx`, `src/components/Stepper.tsx`, `src/i18n/en.ts`, `src/i18n/sl.ts`, `package.json`
- Create: `src/views/DesktopView.tsx`
- Delete: `src/transport/peerjs-transport.ts`, `src/transport/protocol.ts`, `src/transport/protocol.test.ts`, `src/transport/peer-id.ts`, `src/transport/peer-id.test.ts`, `src/transport/types.ts`, `src/session/host-session.ts`, `src/views/HostView.tsx`, `src/router.ts`, `src/router.test.ts`

**Interfaces:**
- Consumes: `detectDevice` (Task 1), `qrPngDataUrl`/`dataUrlToBlob` (Task 2), `saveQrImage` (Task 3), `decodeUpn`, `buildEpcPayload`, existing `scanner.ts`, `revolut.ts`, `QrCode`, `PaymentSummary`.
- Produces:
  - `AppState = { lang, payments, cameraError, notice }`
  - `phoneStep(state): 'scan' | 'pay'`
  - `currentPayment(state): SentPayment | null`

- [ ] **Step 1: Rewrite the step-machine test (failing)**

Replace the entire contents of `src/session/steps.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { phoneStep } from './steps';
import { initialState, type AppState, type SentPayment } from './store';

const payment: SentPayment = {
  id: 'p1',
  epc: 'BCD\n002',
  payment: {
    name: 'Telekom Slovenije d.d.',
    iban: 'SI56020170014356205',
    amountCents: 12345,
    purposeCode: 'OTHR',
    reference: 'SI00 1234-5678',
    remittance: 'Plačilo računa',
  },
};

function state(overrides: Partial<AppState>): AppState {
  return { ...initialState(), ...overrides };
}

describe('phoneStep', () => {
  it('is scan when nothing has been scanned yet', () => {
    expect(phoneStep(state({ payments: [] }))).toBe('scan');
  });

  it('is pay once a payment exists', () => {
    expect(phoneStep(state({ payments: [payment] }))).toBe('pay');
  });

  it('returns to scan when payments are cleared for another bill', () => {
    expect(phoneStep(state({ payments: [] }))).toBe('scan');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test src/session/steps.test.ts`
Expected: FAIL — `initialState` still requires removed fields / `hostStep` import mismatch, or type errors on the reduced `AppState`.

- [ ] **Step 3: Simplify the store**

Rewrite `src/session/store.ts` to drop all connection/transport state. Full new file:

```ts
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
```

- [ ] **Step 4: Simplify the step machine**

Rewrite `src/session/steps.ts`:

```ts
import type { AppState } from './store';

export type PhoneStep = 'scan' | 'pay';

/**
 * The phone derives its step from local state alone: nothing scanned yet means
 * `scan`, a scanned payment means `pay`.
 */
export function phoneStep(state: AppState): PhoneStep {
  return state.payments.length > 0 ? 'pay' : 'scan';
}
```

- [ ] **Step 5: Run the step test to confirm it passes**

Run: `pnpm test src/session/steps.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Strip transport from the phone session**

Rewrite `src/session/phone-session.ts` — keep the scanner attach/detach lifecycle and the bad-read notice cooldown, remove all transport/connection code:

```ts
import { buildEpcPayload } from '../core/epc';
import { decodeUpn } from '../core/upn';
import type { TranslationKey } from '../i18n';
import { startScanner, type ScannerHandle } from './scanner';
import { addPayment, getState, resetPayments, setCameraError, setNotice } from './store';

let scanner: ScannerHandle | null = null;
let scannerVideo: HTMLVideoElement | null = null;
let detachTimer: number | null = null;
let lastNoticeAt = 0;

/** A bad read repeats many times a second; only surface it occasionally. */
const NOTICE_COOLDOWN_MS = 3000;

function notice(key: TranslationKey): void {
  const now = Date.now();
  if (now - lastNoticeAt < NOTICE_COOLDOWN_MS) return;
  lastNoticeAt = now;
  setNotice(key);
}

function handleDecode(text: string): void {
  // Already scanned this bill; ignore whatever is still in frame.
  if (getState().payments.length > 0) return;

  const decoded = decodeUpn(text);
  if (!decoded.ok) {
    // 'not-upn' is the normal state of a viewfinder — stay silent and keep scanning.
    if (decoded.reason === 'malformed') notice('error.upnMalformed');
    return;
  }

  const epc = buildEpcPayload(decoded.payment);
  if (!epc.ok) {
    notice(epc.reason === 'missing-iban' ? 'error.epcIban' : 'error.epcAmount');
    return;
  }

  addPayment({ id: crypto.randomUUID(), epc: epc.payload, payment: decoded.payment });
  stopScanner();
}

function stopScanner(): void {
  scanner?.stop();
  scanner = null;
  scannerVideo = null;
}

/**
 * Attach or detach the camera from a video element.
 *
 * StrictMode detaches and immediately reattaches the same node, so a detach
 * defers one task and is cancelled if the node comes straight back — otherwise
 * every mount would restart getUserMedia and flash the viewfinder.
 */
export function attachScanner(video: HTMLVideoElement | null): void {
  if (!video) {
    detachTimer = window.setTimeout(() => {
      detachTimer = null;
      stopScanner();
    }, 0);
    return;
  }

  if (detachTimer !== null) {
    window.clearTimeout(detachTimer);
    detachTimer = null;
  }

  if (scanner && scannerVideo === video) return;

  stopScanner();
  scannerVideo = video;
  setCameraError(null);
  scanner = startScanner(video, handleDecode, setCameraError);
}

/** Return to the camera for the next bill. */
export function scanAnother(): void {
  resetPayments();
}
```

- [ ] **Step 7: Update the copy — add new keys, remove pairing/transport keys**

Rewrite `src/i18n/sl.ts` to this exact key set (the source of truth for keys):

```ts
export const sl = {
  'app.title': '2upn2revolut',
  'app.tagline': 'UPN koda v EPC kodo, ki jo Revolut zna prebrati',

  'step.scan': 'Skeniraj',
  'step.pay': 'Plačaj',

  'desktop.title': 'Uporabite telefon',
  'desktop.instruction': 'Za skeniranje UPN kode potrebujete telefon s fotoaparatom.',
  'desktop.qrHint': 'S telefonom skenirajte to kodo, da odprete stran na njem.',
  'desktop.qrLabel': 'Povezava za odpiranje na telefonu',

  'phone.scanTitle': 'Skenirajte UPN kodo',
  'phone.scanInstruction': 'Telefon usmerite v QR kodo na položnici',
  'phone.cameraDenied': 'Dostop do fotoaparata je zavrnjen',
  'phone.cameraDeniedHelp': 'V nastavitvah brskalnika dovolite fotoaparat in poskusite znova.',
  'phone.cameraNotFound': 'Fotoaparata ni mogoče najti',
  'phone.cameraInsecure': 'Fotoaparat deluje samo prek HTTPS',
  'phone.cameraRetry': 'Poskusi znova',
  'phone.ready': 'EPC koda pripravljena',
  'phone.saveInstruction': 'Shranite EPC kodo in jo uvozite v Revolut',
  'phone.saveButton': 'Shrani EPC kodo',
  'phone.saveHelp': 'Če se koda ne shrani sama, jo pritisnite in zadržite ter izberite Shrani sliko.',
  'phone.payInstruction': 'V Revolutu odprite skener in izberite sliko iz galerije',
  'phone.openRevolut': 'Odpri Revolut',
  'phone.revolutFailed': 'Revoluta ni bilo mogoče odpreti. Odprite ga ročno in tapnite Skeniraj.',
  'phone.revolutStore': 'Pojdi na revolut.com',
  'phone.scanAnother': 'Skeniraj naslednjo položnico',

  'payment.name': 'Prejemnik',
  'payment.iban': 'IBAN',
  'payment.amount': 'Znesek',
  'payment.purpose': 'Koda namena',
  'payment.reference': 'Referenca',
  'payment.remittance': 'Namen plačila',

  'error.unknown': 'Prišlo je do nepričakovane napake.',
  'error.upnMalformed': 'Ta UPN koda je poškodovana.',
  'error.epcAmount': 'Znesek na položnici ni veljaven za EPC kodo.',
  'error.epcIban': 'Na položnici ni IBAN številke.',
  'error.saveFailed': 'Kode ni bilo mogoče shraniti. Pritisnite in zadržite sliko ter jo shranite ročno.',

  'lang.label': 'Jezik',
} as const;
```

Rewrite `src/i18n/en.ts` with the identical keys:

```ts
import type { sl } from './sl';

export const en: Record<keyof typeof sl, string> = {
  'app.title': '2upn2revolut',
  'app.tagline': 'Turns a UPN code into an EPC code Revolut can read',

  'step.scan': 'Scan',
  'step.pay': 'Pay',

  'desktop.title': 'Use your phone',
  'desktop.instruction': 'Scanning the UPN code needs a phone with a camera.',
  'desktop.qrHint': 'Scan this code with your phone to open the page there.',
  'desktop.qrLabel': 'Link to open on your phone',

  'phone.scanTitle': 'Scan the UPN code',
  'phone.scanInstruction': 'Point your phone at the QR code on the bill',
  'phone.cameraDenied': 'Camera access denied',
  'phone.cameraDeniedHelp': 'Allow the camera in your browser settings, then try again.',
  'phone.cameraNotFound': 'No camera found',
  'phone.cameraInsecure': 'The camera only works over HTTPS',
  'phone.cameraRetry': 'Try again',
  'phone.ready': 'EPC code ready',
  'phone.saveInstruction': 'Save the EPC code, then import it into Revolut',
  'phone.saveButton': 'Save EPC code',
  'phone.saveHelp': 'If it does not save on its own, press and hold the code and choose Save Image.',
  'phone.payInstruction': 'In Revolut open the scanner and pick the image from your gallery',
  'phone.openRevolut': 'Open Revolut',
  'phone.revolutFailed': 'Revolut did not open. Open it manually and tap Scan.',
  'phone.revolutStore': 'Go to revolut.com',
  'phone.scanAnother': 'Scan another bill',

  'payment.name': 'Recipient',
  'payment.iban': 'IBAN',
  'payment.amount': 'Amount',
  'payment.purpose': 'Purpose code',
  'payment.reference': 'Reference',
  'payment.remittance': 'Payment purpose',

  'error.unknown': 'Something unexpected went wrong.',
  'error.upnMalformed': 'That UPN code is malformed.',
  'error.epcAmount': 'The amount on this bill is not valid for an EPC code.',
  'error.epcIban': 'This bill has no IBAN.',
  'error.saveFailed': 'Could not save the code. Press and hold the image to save it manually.',

  'lang.label': 'Language',
};
```

- [ ] **Step 8: Run the i18n test**

Run: `pnpm test src/i18n/i18n.test.ts`
Expected: PASS — keys match across both dictionaries, no empty strings.

- [ ] **Step 9: Update the Stepper to two steps**

Rewrite `src/components/Stepper.tsx`:

```tsx
import { cn } from '../lib/cn';
import { useT } from '../session/useT';

interface StepperProps {
  /** 0 = Scan, 1 = Pay. */
  activeIndex: number;
}

/** Two dots for the two phone steps; derived from local state, so it can't drift. */
function Stepper({ activeIndex }: StepperProps) {
  const t = useT();
  const labels = [t('step.scan'), t('step.pay')];

  return (
    <ol className="flex items-center gap-3" aria-label={labels.join(' → ')}>
      {labels.map((label, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'size-2.5 rounded-full transition-colors',
                active && 'bg-accent',
                done && 'bg-accent/40',
                !active && !done && 'bg-line',
              )}
            />
            <span
              className={cn('text-sm tracking-wide', active ? 'text-ink font-medium' : 'text-muted')}
            >
              {label}
            </span>
            {index < labels.length - 1 && <span aria-hidden className="text-line">—</span>}
          </li>
        );
      })}
    </ol>
  );
}

export { Stepper };
```

- [ ] **Step 10: Create the DesktopView**

Create `src/views/DesktopView.tsx`:

```tsx
import { QrCode } from '../components/QrCode';
import { useT } from '../session/useT';

/** Strip the `?device=` override so the phone opens the page cleanly. */
function appUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('device');
  return url.toString();
}

function DesktopView() {
  const t = useT();
  return (
    <>
      <p className="font-display max-w-sm text-center text-2xl leading-tight text-balance">
        {t('desktop.title')}
      </p>
      <p className="max-w-sm text-center text-sm text-muted">{t('desktop.instruction')}</p>
      <QrCode value={appUrl()} size={240} label={t('desktop.qrLabel')} />
      <p className="max-w-sm text-center text-sm text-muted">{t('desktop.qrHint')}</p>
    </>
  );
}

export { DesktopView };
```

- [ ] **Step 11: Rewrite the PhoneView**

Rewrite `src/views/PhoneView.tsx` — no `peerId`, no connect step; the pay step renders the EPC QR and drives save + Revolut:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { PaymentSummary } from '../components/PaymentSummary';
import { QrCode } from '../components/QrCode';
import { dataUrlToBlob, qrPngDataUrl } from '../core/qr-image';
import { attachScanner, scanAnother } from '../session/phone-session';
import { saveQrImage } from '../session/save';
import { phoneStep } from '../session/steps';
import { openRevolut, resolveRevolutLink, REVOLUT_WEB_URL } from '../session/revolut';
import { currentPayment, setNotice, useAppState, type CameraError } from '../session/store';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

const STEP_INDEX = { scan: 0, pay: 1 } as const;

const CAMERA_ERROR_KEYS: Record<CameraError, TranslationKey> = {
  denied: 'phone.cameraDenied',
  'not-found': 'phone.cameraNotFound',
  'insecure-context': 'phone.cameraInsecure',
  unknown: 'phone.cameraDenied',
};

function PhoneView({ onStepChange }: { onStepChange: (index: number) => void }) {
  const state = useAppState();
  const t = useT();
  const step = phoneStep(state);
  const sent = currentPayment(state);
  const [revolutFailed, setRevolutFailed] = useState(false);

  useEffect(() => {
    onStepChange(STEP_INDEX[step]);
  }, [step, onStepChange]);

  useEffect(() => {
    if (!state.notice) return;
    toast.error(t(state.notice));
    setNotice(null);
  }, [state.notice, t]);

  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    attachScanner(element);
  }, []);

  const onSave = useCallback(async () => {
    if (!sent) return;
    try {
      // Must run straight off the tap: iOS blocks share()/download otherwise.
      const blob = dataUrlToBlob(await qrPngDataUrl(sent.epc));
      await saveQrImage(blob, 'epc-qr.png');
    } catch (error) {
      // A cancelled share sheet is not a failure; anything else is.
      if ((error as { name?: string })?.name === 'AbortError') return;
      setNotice('error.saveFailed');
    }
  }, [sent]);

  const onOpenRevolut = useCallback(() => {
    setRevolutFailed(false);
    openRevolut(
      resolveRevolutLink(window.location.search, import.meta.env.VITE_REVOLUT_DEEPLINK),
      () => setRevolutFailed(true),
    );
  }, []);

  if (step === 'pay' && sent) {
    return (
      <>
        <Badge>{t('phone.ready')}</Badge>
        <QrCode value={sent.epc} size={240} label={t('phone.saveInstruction')} />
        <p className="max-w-sm text-center text-sm text-muted">{t('phone.saveHelp')}</p>
        <Button size="lg" onClick={onSave}>
          {t('phone.saveButton')}
        </Button>
        <p className="font-display max-w-sm text-center text-xl leading-tight text-balance">
          {t('phone.payInstruction')}
        </p>
        {revolutFailed ? (
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="text-center text-sm text-muted">{t('phone.revolutFailed')}</p>
            <Button asChild variant="outline">
              <a href={REVOLUT_WEB_URL} target="_blank" rel="noreferrer">
                {t('phone.revolutStore')}
              </a>
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={onOpenRevolut}>
            {t('phone.openRevolut')}
          </Button>
        )}
        <Card className="w-full max-w-sm">
          <CardContent>
            <PaymentSummary payment={sent.payment} />
          </CardContent>
        </Card>
        <Button variant="outline" onClick={scanAnother}>
          {t('phone.scanAnother')}
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="font-display max-w-sm text-center text-2xl leading-tight text-balance">
        {t('phone.scanInstruction')}
      </p>
      {state.cameraError ? (
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-ink">{t(CAMERA_ERROR_KEYS[state.cameraError])}</p>
          <p className="text-sm text-muted">{t('phone.cameraDeniedHelp')}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('phone.cameraRetry')}
          </Button>
        </div>
      ) : (
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label={t('phone.scanTitle')}
          className="rounded-card w-[min(88vw,26rem)] bg-ink/90 object-cover shadow-sm"
        />
      )}
    </>
  );
}

export { PhoneView };
```

- [ ] **Step 12: Rewrite App to branch by device**

Rewrite `src/App.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import { detectDevice } from './device';
import { useAppState } from './session/store';
import { DesktopView } from './views/DesktopView';
import { PhoneView } from './views/PhoneView';

export default function App() {
  const { lang } = useAppState();
  const device = useMemo(() => detectDevice(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const onStepChange = useCallback((index: number) => setStepIndex(index), []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <TooltipProvider>
      <AppShell activeIndex={stepIndex}>
        {device === 'desktop' ? <DesktopView /> : <PhoneView onStepChange={onStepChange} />}
      </AppShell>
      <Toaster />
    </TooltipProvider>
  );
}
```

- [ ] **Step 13: Delete the transport / host / router code**

```bash
git rm src/transport/peerjs-transport.ts src/transport/protocol.ts src/transport/protocol.test.ts \
       src/transport/peer-id.ts src/transport/peer-id.test.ts src/transport/types.ts \
       src/session/host-session.ts src/views/HostView.tsx \
       src/router.ts src/router.test.ts
```

- [ ] **Step 14: Remove the peerjs dependency**

Run: `pnpm remove peerjs`
(Updates `package.json` and `pnpm-lock.yaml`.)

- [ ] **Step 15: Full verification**

Run each and confirm the stated result:
- `pnpm typecheck` → no errors (no dangling imports of router/HostView/transport/removed store fields).
- `pnpm test` → all suites pass (core, i18n, steps, device, qr-image, save, revolut).
- `pnpm build` → succeeds.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "feat: phone-only offline flow, drop laptop-phone transport

Detect device at startup: desktop shows a handoff QR, phone scans UPN,
builds the EPC QR locally and saves/shares it for Revolut to import.
Remove PeerJS transport, host session/view, and hash routing."
```

---

### Task 5: Rewrite the README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing (docs only).
- Produces: nothing.

- [ ] **Step 1: Rewrite README.md**

Replace the content to describe the single-device, offline model. Required points:
- One-line what/why: Revolut reads EPC (SEPA) QR codes but not Slovenian UPN codes; this phone tool scans the UPN QR, converts it to EPC, and saves the EPC QR as an image you import into Revolut.
- "How it works": open on your phone → scan the UPN QR on the bill → the app builds the EPC QR and offers Save/Share → save it to your photos → open Revolut and import the image from the gallery.
- "On a computer": you get a "use your phone" screen with a QR to open the page on your phone.
- "Design": no server, no networking; QR generation and PNG encoding are fully client-side via the `qrcode` library; deploys as a static site on GitHub Pages. Keep the existing `RF`/`SI` reference-field paragraph verbatim (it is still accurate).
- Remove: the "Why a second device", PeerJS/WebRTC broker, pairing-URL, and TURN/broker-limitation sections — they no longer apply.
- Keep: the Development section (`pnpm install/dev/test/typecheck/build`, the dev-cert note for LAN phone testing — still relevant since the camera needs HTTPS), and the `VITE_REVOLUT_DEEPLINK` / `?revolut=` configuration table.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for phone-only offline flow"
```

---

## Self-Review

**Spec coverage:**
- Remove transport/routing → Task 4 (Steps 6, 13, 14). ✓
- Device branch at root → Task 1 + Task 4 Step 12. ✓
- DesktopView with app-URL QR → Task 4 Step 10. ✓
- Local QR image, no external API → Task 2. ✓
- Save: Share-first + download fallback + always-visible image → Task 3 + Task 4 Step 11 (QrCode rendered on the pay step, `saveQrImage` from a gesture, `saveHelp` long-press instruction). ✓
- 2-step stepper, phone-only step machine → Task 4 Steps 1–5, 9. ✓
- Store simplification → Task 4 Step 3. ✓
- i18n add/remove keys, bilingual parity → Task 4 Steps 7–8. ✓
- `?device=` override → Task 1. ✓
- Keep UPN/EPC/scanner/revolut → untouched; verified green in Task 4 Step 15. ✓
- Tests: device, qr-image, save, steps; delete router/transport tests → Tasks 1–4. ✓
- README rewrite → Task 5. ✓
- Manual iOS/Android verification → out of automated scope, noted in spec Risks.

**Placeholder scan:** No TBD/TODO; every code step has full content; README step lists exact required points rather than prose to invent (acceptable — it is a docs task with explicit content requirements).

**Type consistency:** `AppState` fields (`lang`, `payments`, `cameraError`, `notice`) are consistent across store, steps, phone-session, PhoneView, App. `SentPayment` unchanged. `currentPayment` returns `SentPayment | null`. `phoneStep` returns `'scan' | 'pay'`; `STEP_INDEX` matches. `saveQrImage(blob, filename)` / `pickSaveStrategy(nav, file)` signatures match their test and caller. `qrPngDataUrl`/`dataUrlToBlob` signatures match caller in PhoneView. `detectDevice()`/`classifyDevice(env)` match App and test.
