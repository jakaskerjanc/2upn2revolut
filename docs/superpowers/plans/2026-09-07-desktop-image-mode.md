# Desktop image-conversion mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let desktop users convert a UPN QR image (upload/paste/drop) into an EPC QR they scan with Revolut on their phone, keeping the phone hand-off as a secondary option.

**Architecture:** Extract the phone's existing decode→build conversion into a shared `ingestUpn`; add a still-image QR decoder to `scanner.ts` beside the video one; rewrite `DesktopView` into an input screen (image in) and a result screen (EPC QR + `revolut://` launch QR) driven by the existing `payments` store.

**Tech Stack:** React 19, TypeScript (strict), Vite, `@zxing/browser` (still-image decode, already a dependency), `qrcode`, Tailwind v4, vitest.

**Spec:** `docs/superpowers/specs/2026-09-07-desktop-image-mode-design.md`

## Global Constraints

- **No new runtime dependency.** `@zxing/browser` decodes still images; do not add pdf.js or any package.
- **Images only.** PNG/JPG/etc. via upload, paste, drag-drop. No PDF.
- **i18n key parity.** Every key exists in both `src/i18n/sl.ts` and `src/i18n/en.ts`, no empty strings — `src/i18n/i18n.test.ts` enforces this. `TranslationKey = keyof typeof sl`, so **add each new key to `sl.ts` first**, then mirror it in `en.ts`.
- **Static site, no server, no networking.** Conversion stays fully client-side.
- **Phone behaviour must not change.** After the `handleDecode` refactor, the viewfinder still stays silent on a non-UPN QR and still surfaces malformed/EPC errors via the cooldown `notice`.
- **TypeScript strict.** `pnpm typecheck` must pass. `pnpm test` must stay green.
- Commit messages: concise, conventional-commit style (matches existing history).

---

### Task 1: i18n keys for desktop mode

**Files:**
- Modify: `src/i18n/sl.ts`
- Modify: `src/i18n/en.ts`
- Test: `src/i18n/i18n.test.ts` (existing — no edit; it enforces parity/non-empty)

**Interfaces:**
- Consumes: nothing.
- Produces: new `TranslationKey`s — `desktop.uploadTitle`, `desktop.uploadInstruction`, `desktop.uploadButton`, `desktop.uploadHint`, `desktop.decoding`, `desktop.orPhoneTitle`, `desktop.resultInstruction`, `desktop.revolutQrCaption`, `desktop.revolutQrLabel`, `desktop.convertAnother`, `error.noQrInImage`, `error.notUpn`. The existing `desktop.title/instruction/qrHint/qrLabel` are retained.

- [ ] **Step 1: Add the new keys to `sl.ts`** (source of the `TranslationKey` type — add here first)

Insert into the `desktop.*` block (after the existing `desktop.qrLabel` line):

```ts
  'desktop.uploadTitle': 'Pretvori UPN kodo',
  'desktop.uploadInstruction': 'Naložite, prilepite ali povlecite sliko UPN QR kode s položnice',
  'desktop.uploadButton': 'Izberi sliko',
  'desktop.uploadHint': 'ali prilepite (Ctrl+V / ⌘V) ali povlecite sem',
  'desktop.decoding': 'Berem kodo …',
  'desktop.orPhoneTitle': 'Ali nadaljujte na telefonu',
  'desktop.resultInstruction': 'To kodo skenirajte v Revolutu',
  'desktop.revolutQrCaption': 'Revolut še ni odprt? To kodo skenirajte s telefonom, da ga zaženete, nato skenirajte kodo zgoraj.',
  'desktop.revolutQrLabel': 'Odpri Revolut na telefonu',
  'desktop.convertAnother': 'Pretvori naslednjo',
```

Insert into the `error.*` block (after `error.epcIban`):

```ts
  'error.noQrInImage': 'Na sliki ni QR kode.',
  'error.notUpn': 'QR koda na sliki ni UPN koda.',
```

- [ ] **Step 2: Mirror the same keys in `en.ts`**

Into the `desktop.*` block (after `desktop.qrLabel`):

```ts
  'desktop.uploadTitle': 'Convert a UPN code',
  'desktop.uploadInstruction': "Upload, paste, or drop a picture of the bill's UPN QR code",
  'desktop.uploadButton': 'Choose image',
  'desktop.uploadHint': 'or paste (Ctrl+V / ⌘V), or drop it here',
  'desktop.decoding': 'Reading the code…',
  'desktop.orPhoneTitle': 'Or continue on your phone',
  'desktop.resultInstruction': 'Scan this code in Revolut',
  'desktop.revolutQrCaption': 'No Revolut open? Scan this with your phone to launch it, then scan the code above.',
  'desktop.revolutQrLabel': 'Open Revolut on your phone',
  'desktop.convertAnother': 'Convert another',
```

Into the `error.*` block (after `error.epcIban`):

```ts
  'error.noQrInImage': 'No QR code found in that image.',
  'error.notUpn': "That image's QR code isn't a UPN code.",
```

- [ ] **Step 3: Run the i18n test to verify parity and non-empty**

Run: `pnpm test -- src/i18n/i18n.test.ts`
Expected: PASS (both languages have identical key sets, no empty strings).

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/sl.ts src/i18n/en.ts
git commit -m "feat(i18n): keys for desktop image-conversion mode"
```

---

### Task 2: Shared `ingestUpn` conversion + phone refactor

**Files:**
- Create: `src/session/ingest.ts`
- Create: `src/session/ingest.test.ts`
- Modify: `src/session/phone-session.ts` (refactor `handleDecode` onto `ingestUpn`)

**Interfaces:**
- Consumes: `decodeUpn` from `../core/upn` (`UpnDecodeResult`, reasons `'not-upn' | 'malformed'`); `buildEpcPayload` from `../core/epc` (reasons `'amount-out-of-range' | 'missing-iban'`); `SentPayment` from `./store`; `TranslationKey` from `../i18n`.
- Produces:
  - `type IngestFailureReason = 'not-upn' | 'malformed' | 'epc-amount' | 'epc-iban'`
  - `type IngestResult = { ok: true; entry: SentPayment } | { ok: false; reason: IngestFailureReason }`
  - `function ingestUpn(text: string): IngestResult`
  - `function ingestErrorKey(reason: IngestFailureReason): TranslationKey`

- [ ] **Step 1: Write the failing test** — `src/session/ingest.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { ingestErrorKey, ingestUpn, type IngestFailureReason } from './ingest';

const SI_REFERENCE_BILL =
  'UPNQR\n\n\n\n\nJanez Novak\nUlica 1\n1000 Ljubljana\n00000012345\n\n\nOTHR\n' +
  'Plačilo računa\n\nSI56020170014356205\nSI00 1234-5678\nTelekom Slovenije d.d.\n' +
  'Cigaletova 15\n1000 Ljubljana\n167\n';

describe('ingestUpn', () => {
  it('converts a valid UPN payload into a stored payment entry', () => {
    const result = ingestUpn(SI_REFERENCE_BILL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.payment.iban).toBe('SI56020170014356205');
    expect(result.entry.payment.amountCents).toBe(12345);
    expect(result.entry.epc.startsWith('BCD\n')).toBe(true);
    expect(typeof result.entry.id).toBe('string');
    expect(result.entry.id.length).toBeGreaterThan(0);
  });

  it('gives each entry a distinct id', () => {
    const a = ingestUpn(SI_REFERENCE_BILL);
    const b = ingestUpn(SI_REFERENCE_BILL);
    expect(a.ok && b.ok && a.entry.id !== b.entry.id).toBe(true);
  });

  it('reports a non-UPN string as not-upn', () => {
    expect(ingestUpn('https://example.com')).toEqual({ ok: false, reason: 'not-upn' });
  });

  it('reports a corrupted UPN payload as malformed', () => {
    const corrupted = SI_REFERENCE_BILL.replace('\n167\n', '\n999\n');
    expect(ingestUpn(corrupted)).toEqual({ ok: false, reason: 'malformed' });
  });
});

describe('ingestErrorKey', () => {
  it('maps every failure reason to a translation key', () => {
    const cases: Record<IngestFailureReason, string> = {
      'not-upn': 'error.notUpn',
      malformed: 'error.upnMalformed',
      'epc-amount': 'error.epcAmount',
      'epc-iban': 'error.epcIban',
    };
    for (const [reason, key] of Object.entries(cases)) {
      expect(ingestErrorKey(reason as IngestFailureReason)).toBe(key);
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test -- src/session/ingest.test.ts`
Expected: FAIL (cannot resolve `./ingest`).

- [ ] **Step 3: Write `src/session/ingest.ts`**

```ts
import { buildEpcPayload } from '../core/epc';
import { decodeUpn } from '../core/upn';
import type { TranslationKey } from '../i18n';
import type { SentPayment } from './store';

export type IngestFailureReason = 'not-upn' | 'malformed' | 'epc-amount' | 'epc-iban';

export type IngestResult =
  | { ok: true; entry: SentPayment }
  | { ok: false; reason: IngestFailureReason };

/**
 * Decode a raw QR payload into a ready-to-store payment: UPN decode, then EPC
 * build. This is the one conversion path both the phone camera and the desktop
 * image upload share. It never touches the store — callers decide what each
 * failure means (the viewfinder stays silent on 'not-upn'; desktop reports it).
 */
export function ingestUpn(text: string): IngestResult {
  const decoded = decodeUpn(text);
  if (!decoded.ok) return { ok: false, reason: decoded.reason };

  const epc = buildEpcPayload(decoded.payment);
  if (!epc.ok) {
    return { ok: false, reason: epc.reason === 'missing-iban' ? 'epc-iban' : 'epc-amount' };
  }

  return {
    ok: true,
    entry: { id: crypto.randomUUID(), epc: epc.payload, payment: decoded.payment },
  };
}

const ERROR_KEYS: Record<IngestFailureReason, TranslationKey> = {
  'not-upn': 'error.notUpn',
  malformed: 'error.upnMalformed',
  'epc-amount': 'error.epcAmount',
  'epc-iban': 'error.epcIban',
};

/** Map a failure reason to the message key a UI surfaces for it. */
export function ingestErrorKey(reason: IngestFailureReason): TranslationKey {
  return ERROR_KEYS[reason];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/session/ingest.test.ts`
Expected: PASS.

- [ ] **Step 5: Refactor `phone-session.ts` `handleDecode` onto `ingestUpn`**

In `src/session/phone-session.ts`, replace the two imports of `buildEpcPayload` / `decodeUpn` with the ingest import, and rewrite `handleDecode`.

Change the top imports from:

```ts
import { buildEpcPayload } from '../core/epc';
import { decodeUpn } from '../core/upn';
import type { TranslationKey } from '../i18n';
import { startScanner, type ScannerHandle } from './scanner';
import { addPayment, getState, resetPayments, setCameraError, setNotice } from './store';
```

to:

```ts
import type { TranslationKey } from '../i18n';
import { ingestErrorKey, ingestUpn } from './ingest';
import { startScanner, type ScannerHandle } from './scanner';
import { addPayment, getState, resetPayments, setCameraError, setNotice } from './store';
```

Replace the whole `handleDecode` function body with:

```ts
function handleDecode(text: string): void {
  // Already scanned this bill; ignore whatever is still in frame.
  if (getState().payments.length > 0) return;

  const result = ingestUpn(text);
  if (!result.ok) {
    // 'not-upn' is the normal state of a viewfinder — stay silent and keep scanning.
    if (result.reason !== 'not-upn') notice(ingestErrorKey(result.reason));
    return;
  }

  addPayment(result.entry);
  stopScanner();
}
```

(`notice`, `stopScanner`, `addPayment`, `getState` are unchanged and still used. `TranslationKey` is still used by `notice`'s signature.)

- [ ] **Step 6: Run the full suite + typecheck to confirm the phone path is intact**

Run: `pnpm test`
Expected: PASS (all existing suites, plus `ingest.test.ts`).
Run: `pnpm typecheck`
Expected: no errors (confirms no now-unused imports remain in `phone-session.ts`).

- [ ] **Step 7: Commit**

```bash
git add src/session/ingest.ts src/session/ingest.test.ts src/session/phone-session.ts
git commit -m "refactor: share UPN->EPC conversion via ingestUpn"
```

**Note for reviewer:** `ingestUpn`'s `epc-amount`/`epc-iban` branches forward `buildEpcPayload`'s failures, whose behaviour is tested directly in `src/core/epc.test.ts`; those reasons cannot be produced through `decodeUpn` here because altering a UPN amount/IBAN field breaks its checksum (→ `malformed`). `ingestErrorKey` covers the key mapping for all four reasons.

---

### Task 3: Desktop image-conversion view

**Files:**
- Modify: `src/session/scanner.ts` (add `decodeImageFile`)
- Modify: `src/views/DesktopView.tsx` (rewrite)
- Modify: `src/App.tsx` (pass `onStepChange` to `DesktopView`)

**Interfaces:**
- Consumes: `ingestUpn`, `ingestErrorKey` from `../session/ingest`; `decodeImageFile` from `../session/scanner`; `resolveRevolutLink` from `../session/revolut`; `addPayment`, `currentPayment`, `resetPayments`, `useAppState` from `../session/store`; `QrCode`, `PaymentSummary`, `Badge`, `Button`, `Card`, `CardContent`; `useT`; `TranslationKey`.
- Produces: `async function decodeImageFile(file: Blob): Promise<string | null>` in `scanner.ts`; `DesktopView` now takes `{ onStepChange: (index: number) => void }`.

- [ ] **Step 1: Add `decodeImageFile` to `src/session/scanner.ts`**

Append this exported function (the file already imports `BrowserQRCodeReader`):

```ts
/**
 * Decode a QR from a still image (upload, paste, or drop) instead of the live
 * camera. Returns the decoded text, or null when the image holds no QR zxing
 * can read — the desktop caller surfaces null as "no code found in that image".
 */
export async function decodeImageFile(file: Blob): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const result = await new BrowserQRCodeReader().decodeFromImageUrl(url);
    return result.getText();
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 2: Typecheck the new decoder**

Run: `pnpm typecheck`
Expected: no errors (confirms `decodeFromImageUrl` exists on `BrowserQRCodeReader` in `@zxing/browser` 0.2.1).

- [ ] **Step 3: Rewrite `src/views/DesktopView.tsx`**

Replace the entire file with:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { PaymentSummary } from '../components/PaymentSummary';
import { QrCode } from '../components/QrCode';
import { ingestErrorKey, ingestUpn } from '../session/ingest';
import { resolveRevolutLink } from '../session/revolut';
import { decodeImageFile } from '../session/scanner';
import { addPayment, currentPayment, resetPayments, useAppState } from '../session/store';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

const STEP_INDEX = { input: 0, result: 1 } as const;

/** Strip the `?device=` override so the phone opens the page cleanly. */
function appUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('device');
  return url.toString();
}

/** First image in a list of files, or undefined. */
function firstImage(files: Iterable<File>): File | undefined {
  return Array.from(files).find((file) => file.type.startsWith('image/'));
}

function DesktopView({ onStepChange }: { onStepChange: (index: number) => void }) {
  const state = useAppState();
  const t = useT();
  const sent = currentPayment(state);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onStepChange(sent ? STEP_INDEX.result : STEP_INDEX.input);
  }, [sent, onStepChange]);

  const handleFile = useCallback(async (file: Blob) => {
    setError(null);
    setBusy(true);
    try {
      const text = await decodeImageFile(file);
      if (text === null) {
        setError('error.noQrInImage');
        return;
      }
      const result = ingestUpn(text);
      if (!result.ok) {
        setError(ingestErrorKey(result.reason));
        return;
      }
      addPayment(result.entry); // flips currentPayment -> result screen
    } finally {
      setBusy(false);
    }
  }, []);

  // Pasting a copied UPN QR is the fastest desktop path, so listen for an image
  // paste anywhere while the input screen is showing.
  useEffect(() => {
    if (sent) return;
    function onPaste(event: ClipboardEvent): void {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith('image/'),
      );
      const file = item?.getAsFile();
      if (file) void handleFile(file);
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [sent, handleFile]);

  if (sent) {
    const revolutLink = resolveRevolutLink(
      window.location.search,
      import.meta.env.VITE_REVOLUT_DEEPLINK,
    );
    return (
      <>
        <Badge>{t('phone.ready')}</Badge>
        <QrCode value={sent.epc} size={240} label={t('desktop.resultInstruction')} />
        <p className="font-display max-w-sm text-center text-xl leading-tight text-balance">
          {t('desktop.resultInstruction')}
        </p>
        <div className="flex max-w-sm flex-col items-center gap-3">
          <QrCode value={revolutLink} size={150} label={t('desktop.revolutQrLabel')} />
          <p className="text-center text-sm text-muted">{t('desktop.revolutQrCaption')}</p>
        </div>
        <Card className="w-full max-w-sm">
          <CardContent>
            <PaymentSummary payment={sent.payment} />
          </CardContent>
        </Card>
        <Button variant="outline" onClick={resetPayments}>
          {t('desktop.convertAnother')}
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="font-display max-w-sm text-center text-2xl leading-tight text-balance">
        {t('desktop.uploadTitle')}
      </p>
      <p className="max-w-sm text-center text-sm text-muted">{t('desktop.uploadInstruction')}</p>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = firstImage(event.dataTransfer.files);
          if (file) void handleFile(file);
        }}
        className="rounded-card flex w-[min(88vw,26rem)] flex-col items-center gap-4 border border-dashed border-line bg-surface p-8"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />
        <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          {t('desktop.uploadButton')}
        </Button>
        <p className="text-center text-sm text-muted">
          {busy ? t('desktop.decoding') : t('desktop.uploadHint')}
        </p>
        {error && <p className="text-center text-sm text-ink">{t(error)}</p>}
      </div>
      <div className="flex max-w-sm flex-col items-center gap-3">
        <p className="text-sm text-muted">{t('desktop.orPhoneTitle')}</p>
        <QrCode value={appUrl()} size={150} label={t('desktop.qrLabel')} />
        <p className="max-w-sm text-center text-sm text-muted">{t('desktop.qrHint')}</p>
      </div>
    </>
  );
}

export { DesktopView };
```

- [ ] **Step 4: Wire `onStepChange` into `DesktopView` in `src/App.tsx`**

Change the render line from:

```tsx
        {device === 'desktop' ? <DesktopView /> : <PhoneView onStepChange={onStepChange} />}
```

to:

```tsx
        {device === 'desktop' ? (
          <DesktopView onStepChange={onStepChange} />
        ) : (
          <PhoneView onStepChange={onStepChange} />
        )}
```

- [ ] **Step 5: Typecheck, test, and build**

Run: `pnpm typecheck`
Expected: no errors.
Run: `pnpm test`
Expected: PASS (no regressions).
Run: `pnpm build`
Expected: builds successfully (confirms the view compiles and bundles).

- [ ] **Step 6: Manual QA (record result in the report)**

Start `pnpm dev`, open `http://localhost:5173/2upn2revolut/?device=desktop`. Verify: choosing a UPN-QR image shows the EPC QR + summary + `revolut://` QR; a non-QR image shows "No QR code found in that image."; a non-UPN QR (e.g. a URL QR) shows "That image's QR code isn't a UPN code."; paste and drag-drop both work; "Convert another" returns to the input screen; the "or continue on your phone" QR still renders.

- [ ] **Step 7: Commit**

```bash
git add src/session/scanner.ts src/views/DesktopView.tsx src/App.tsx
git commit -m "feat: desktop image-to-EPC conversion mode"
```

---

### Task 4: Update README for the desktop flow

**Files:**
- Modify: `README.md` (the "On a computer" section)

**Interfaces:**
- Consumes: nothing. Produces: nothing (docs only).

- [ ] **Step 1: Rewrite the "On a computer" section**

Replace the current section:

```markdown
## On a computer

Opening the site on a computer shows a "use your phone" screen with a QR that encodes the
app URL — scan it with your phone's camera app to continue there.
```

with:

```markdown
## On a computer

On a computer you can convert without a phone camera: upload, paste, or drag in an image of
the bill's UPN QR code. The app decodes it, builds the EPC QR, and shows it on screen — scan
that with Revolut on your phone. A smaller `revolut://` QR is offered too: scan it with your
phone to launch Revolut straight on its scanner. The old "continue on your phone" hand-off QR
stays available as a second option. (Images only — PDFs are not supported.)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document desktop image-conversion flow"
```

---

## Self-Review

**Spec coverage:**
- Upload/paste/drop image input → Task 3 (`handleFile`, file input, paste listener, drop handler). ✓
- Shared conversion identical to phone → Task 2 (`ingestUpn`, phone refactor). ✓
- EPC QR result + `revolut://` launch QR with caption → Task 3 result screen. ✓
- Phone hand-off kept as secondary → Task 3 input screen "or continue on your phone" block. ✓
- No new dependency (zxing still-image decode) → Task 3 `decodeImageFile`. ✓
- Inline errors, images-only, no Save button, stepper labels unchanged → Task 3. ✓
- Desktop drives the stepper → Task 3 `onStepChange` + Task 3 Step 4 `App.tsx`. ✓
- i18n keys + parity → Task 1. ✓
- README update → Task 4. ✓

**Placeholder scan:** No TBDs; every code step has full content.

**Type consistency:** `ingestUpn`/`ingestErrorKey`/`IngestFailureReason` defined in Task 2 are consumed with the same names/signatures in Task 3. `decodeImageFile(file: Blob): Promise<string | null>` defined and consumed consistently. `DesktopView` prop `{ onStepChange }` matches `App.tsx` usage. New `TranslationKey`s from Task 1 are the exact strings used in Tasks 2–3.
