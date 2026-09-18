# Desktop image-conversion mode

## Problem

Desktop mode today is a dead end: it only shows a "use your phone" screen with a
QR encoding the app URL, because scanning a paper bill needs a camera. But UPN
QR codes often arrive on a computer already — an e-bill PDF, a screenshot, an
image in an email. On those, the phone hand-off is pure friction.

Desktop should convert on its own: take an **image** of a UPN QR, decode it,
build the EPC payload, and show an EPC QR the user scans with Revolut on their
phone — while keeping the phone hand-off as a still-valid alternative.

## Goals

- Desktop accepts a UPN-QR image via **upload, paste, or drag-and-drop**.
- The image is decoded and converted to EPC using the *existing* conversion
  path (`decodeUpn` → `buildEpcPayload`), byte-identical to the phone.
- The result screen shows the **EPC QR** (scanned on-screen by phone Revolut)
  plus a smaller **`revolut://` deep-link QR** the user can scan with their
  phone camera to launch Revolut.
- The current phone hand-off QR stays as a secondary, still-valid option.
- No new runtime dependency, no server, still a static site.

## Non-goals

- **PDF input.** Images only. PDF would need a renderer (pdf.js, ~1 MB) — out
  of scope.
- **A "Save PNG" button on desktop.** Desktop scans the on-screen QR directly;
  saving is a phone-only concern and stays there.
- **Changing the stepper.** The two dots stay labelled "Scan" / "Pay";
  uploading an image is the desktop analogue of scanning, close enough.
- **A clickable "Open Revolut" button on desktop.** `openRevolut` is tap-based
  (relies on the page backgrounding); it is meaningless without the app on the
  same device. Desktop offers the deep link only as a QR.

## Design

### State and step machine

Desktop reuses the existing `payments` store unchanged. That already gives two
states via `currentPayment(state)`:

- no payment → **input** screen
- a payment → **result** screen

`DesktopView` starts driving the stepper the same way `PhoneView` does: it takes
an `onStepChange(index)` prop and reports `0` on the input screen, `1` on the
result screen. `App.tsx` passes `onStepChange` to `DesktopView` (symmetric with
`PhoneView`).

`resetPayments()` (already used by the phone's "Scan another") returns desktop
to the input screen for "Convert another".

### Shared conversion: `session/ingest.ts` (new)

`phone-session.handleDecode` currently inlines `decodeUpn → buildEpcPayload →
addPayment`. Extract the decode-and-build half so desktop and phone share one
path:

```ts
export type IngestFailure =
  | { reason: 'not-upn' }        // decoded a QR, but not a UPN one
  | { reason: 'malformed' }      // a broken UPN QR
  | { reason: 'epc-amount' }     // amount out of EPC range
  | { reason: 'epc-iban' };      // no IBAN

export type IngestResult =
  | { ok: true; entry: SentPayment }
  | ({ ok: false } & IngestFailure);

export function ingestUpn(text: string): IngestResult;
```

`ingestUpn` runs `decodeUpn`, then `buildEpcPayload`, mapping each failure to a
`reason`, and on success returns a `SentPayment`
(`{ id: crypto.randomUUID(), epc, payment }`). It does **not** touch the store —
callers decide what to do with the outcome.

A pure mapper turns a failure reason into a translation key, so both the key
mapping and `ingestUpn` are unit-testable:

```ts
export function ingestErrorKey(reason: IngestFailure['reason']): TranslationKey;
```

Mapping: `not-upn → error.notUpn`, `malformed → error.upnMalformed`,
`epc-amount → error.epcAmount`, `epc-iban → error.epcIban`.

**Phone unchanged in behaviour.** `handleDecode` becomes: bail if a payment
already exists; call `ingestUpn`; on `not-upn` stay silent (normal viewfinder
state); on any other failure `notice(ingestErrorKey(reason))` (subject to the
existing cooldown); on `ok` `addPayment(entry)` and `stopScanner()`.

### Still-image decode: `session/scanner.ts`

Add a still-image decoder next to the existing video scanner, keeping all
`@zxing/browser` usage in one module:

```ts
export async function decodeImageFile(file: Blob): Promise<string | null>;
```

It creates an object URL from the `Blob`, runs
`new BrowserQRCodeReader().decodeFromImageUrl(url)`, revokes the URL in a
`finally`, and returns the decoded text — or `null` when zxing finds no QR
(it throws `NotFoundException`; any decode throw is caught and returned as
`null`, i.e. "no code found"). Thin wrapper; untested, like `startScanner`.

### `views/DesktopView.tsx` (rewritten)

Local component state only: `busy: boolean` and `error: TranslationKey | null`.
No store or toast wiring — errors render inline (desktop has the room, and it
avoids threading the notice→toast effect into a second view).

**One shared handler** drives all three input methods:

```ts
async function handleFile(file: Blob) {
  setError(null);
  setBusy(true);
  try {
    const text = await decodeImageFile(file);
    if (text === null) { setError('error.noQrInImage'); return; }
    const result = ingestUpn(text);
    if (!result.ok) { setError(ingestErrorKey(result.reason)); return; }
    addPayment(result.entry);   // flips currentPayment → result screen
  } finally {
    setBusy(false);
  }
}
```

- **Upload** — a hidden `<input type="file" accept="image/*">` behind a
  "Choose image" button.
- **Paste** — a `document`-level `paste` listener (added in an effect, removed
  on unmount) that pulls the first `image/*` item off `clipboardData` and calls
  `handleFile`.
- **Drag-and-drop** — `onDragOver`/`onDrop` on the drop zone; `handleFile` on
  the first dropped `image/*` file. A dragging highlight is a nice-to-have.

**Input screen layout:**
- heading + instruction ("Upload, paste, or drop a picture of the bill's UPN
  QR code")
- drop zone: "Choose image" button + hint ("or paste Ctrl+V / ⌘V, or drop it
  here"); shows "Reading the code…" while `busy`; shows the inline `error`
  message when set
- secondary block: the existing app-URL QR under an "or continue on your phone"
  heading (current `desktop.title` / `instruction` / `qrHint` / `qrLabel`
  reused)

**Result screen layout** (mirrors the phone's `pay` step, minus Save):
- "EPC code ready" badge (reuse `phone.ready`)
- **EPC QR**, prominent (`size={240}`) — "Scan this code in Revolut"
- smaller **`revolut://` QR** (`size≈150`) + caption: "No Revolut open? Scan
  this with your phone to launch it, then scan the code above." Value from
  `resolveRevolutLink(window.location.search, import.meta.env.VITE_REVOLUT_DEEPLINK)`
- reused `PaymentSummary` card
- "Convert another" button → `resetPayments()`

### `App.tsx`

Pass `onStepChange` to `DesktopView`, exactly as it is passed to `PhoneView`.

### i18n (`en.ts` + `sl.ts`)

New keys:

| key | English (sl mirrors) |
| --- | --- |
| `desktop.uploadTitle` | Convert a UPN code |
| `desktop.uploadInstruction` | Upload, paste, or drop a picture of the bill's UPN QR code |
| `desktop.uploadButton` | Choose image |
| `desktop.uploadHint` | or paste (Ctrl+V / ⌘V), or drop it here |
| `desktop.decoding` | Reading the code… |
| `desktop.orPhoneTitle` | Or continue on your phone |
| `desktop.resultInstruction` | Scan this code in Revolut |
| `desktop.revolutQrCaption` | No Revolut open? Scan this with your phone to launch it, then scan the code above. |
| `desktop.revolutQrLabel` | Open Revolut on your phone |
| `desktop.convertAnother` | Convert another |
| `error.noQrInImage` | No QR code found in that image. |
| `error.notUpn` | That image's QR code isn't a UPN code. |

The existing `desktop.title` / `desktop.instruction` / `desktop.qrHint` /
`desktop.qrLabel` are retained for the secondary phone-hand-off block.

## Error handling

All surfaced inline on the input screen:

| condition | key |
| --- | --- |
| no QR decodable in the image | `error.noQrInImage` |
| QR present but not a UPN QR | `error.notUpn` |
| UPN QR malformed | `error.upnMalformed` (existing) |
| amount out of EPC range | `error.epcAmount` (existing) |
| no IBAN | `error.epcIban` (existing) |

## Testing

Matches the repo's convention: pure logic is unit-tested; view wiring and thin
browser wrappers are not (no RTL in the project).

- `session/ingest.test.ts` (new): `ingestUpn` over a valid UPN payload
  (→ `ok`, correct `epc`/`payment`), a non-UPN string (→ `not-upn`), a
  malformed UPN, and IBAN/amount EPC failures; `ingestErrorKey` for every
  reason.
- `session/scanner.ts` `decodeImageFile`: untested (thin zxing wrapper, like
  `startScanner`).
- `DesktopView`: not unit-tested (no component-test harness exists); covered by
  the shared `ingestUpn` tests and manual QA.
- Existing suites (`phone-session` behaviour via `steps`, `epc`, `upn`, `save`,
  `revolut`, `i18n`) must stay green after the `handleDecode` refactor; the
  i18n test enforces `en`/`sl` key parity for the new keys.

## Files

- `src/session/ingest.ts` — new
- `src/session/ingest.test.ts` — new
- `src/session/scanner.ts` — add `decodeImageFile`
- `src/session/phone-session.ts` — `handleDecode` onto `ingestUpn`
- `src/views/DesktopView.tsx` — rewritten
- `src/App.tsx` — pass `onStepChange` to `DesktopView`
- `src/i18n/en.ts`, `src/i18n/sl.ts` — new keys
- `README.md` — update the "On a computer" section
