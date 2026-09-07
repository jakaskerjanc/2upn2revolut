# 2upn2revolut — Phone-Only Rework Design

**Date:** 2026-09-07
**Status:** Approved for planning
**Supersedes the transport model of:** `2026-08-24-2upn2revolut-design.md` (two-device WebRTC pairing)

## Problem

The current app splits work across two devices: the phone scans the UPN QR and
relays the EPC payload over WebRTC (PeerJS broker) to a desktop screen, which
displays the EPC QR for the same phone's Revolut app to scan. This exists only
because a phone camera cannot show a QR to itself.

That indirection is the app's biggest source of fragility and cost:

1. It depends on the public PeerJS broker — a third-party with a documented
   rate-limiting history. If it is down, the whole flow fails.
2. It requires two devices present together, plus a pairing handshake.
3. It carries a whole transport layer (peer ids, protocol, connection state) that
   has nothing to do with the actual job of converting UPN → EPC.

Revolut can **import an EPC QR from an image in the photo library**, which removes
the reason for the second screen entirely.

## New model

One device, no network. On a phone the user:

1. Scans the UPN QR on their bill (existing camera scanner).
2. The app converts UPN → EPC and renders the EPC QR to an image, all client-side.
3. The app hands that image to the OS (share sheet → Save to Photos, or share
   straight into Revolut; download as fallback).
4. The user opens Revolut and imports the EPC QR from their gallery.

If the app is opened on a non-phone, it shows a "use your phone" screen with a QR
encoding the app URL so the user can hop over by scanning it.

## Goals

- Remove all device-to-device communication and the entire transport layer.
- Keep the whole scan → convert → QR chain 100% client-side (no external APIs;
  the only prior external dependency, the PeerJS broker, is deleted).
- Branch the UI by device: phone gets the tool, desktop gets a handoff screen.
- Preserve the existing domain logic (UPN decode, EPC build) and its tests intact.

## Non-goals

- Any networking, server, or peer broker.
- Guaranteeing the image lands in the Photos gallery on every browser — this is
  best-effort (see Risks); iOS behaviour is verified manually, not automated.
- Reworking the UPN/EPC domain logic — it is reused unchanged.
- PWA/offline packaging, e2e tests, new tooling (unchanged from prior non-goals).
- Persisted history beyond the current in-memory last-five.

## Decisions

| Area | Choice |
| --- | --- |
| Transport | **Removed entirely.** No PeerJS, no protocol, no peer ids, no connection state. |
| Routing | **Removed.** No URL-encoded peer id; the view is chosen by device detection, not the hash. |
| Device branch | `App` detects device once and renders `PhoneView` or `DesktopView`. |
| QR image | Rendered locally via the bundled `qrcode` lib to a canvas, then `canvas.toBlob('image/png')`. No new deps, no network. |
| Save mechanism | `navigator.share({ files:[png] })` primary; anchor `download` fallback; on-screen image always rendered as the universal long-press fallback. |
| Desktop screen | "Use your phone" message + `QrCode` encoding the app URL. |
| Detection override | `?device=phone` / `?device=desktop` query param for dev/testing (mirrors `?revolut=`). |

## Architecture

Single-page app, branched at the root, no networking.

```
App
 ├─ detectDevice() ──▶ 'phone' | 'desktop'
 ├─ PhoneView    (scan → convert → save/pay)
 └─ DesktopView  (handoff message + app-URL QR)
```

### Components & modules

**New**

- `src/device.ts` — `detectDevice(overrides?): 'phone' | 'desktop'`. Heuristic:
  coarse pointer + touch capability, with a mobile-UA check as tie-breaker;
  honours the `?device=` override. Pure function taking an injectable
  `navigator`/`matchMedia`-like input so it is unit-testable.
- `src/views/DesktopView.tsx` — message + `QrCode` of `window.location.href`
  (stripped of any `?device=` override so the phone opens clean).
- `src/core/qr-image.ts` — `epcQrPngBlob(value: string): Promise<Blob>`. Renders
  the QR to a detached canvas via `qrcode` and resolves a PNG `Blob`. Shared by
  `QrCode.tsx` (display) and the phone save flow (file). No new deps.
- `src/session/save.ts` — `saveQrImage(blob, filename)`: try
  `navigator.canShare({files})` + `navigator.share`; on unsupported/failure,
  anchor-download the blob. Returns which path was taken so the view can adjust
  its instruction. Must be called from a user-gesture handler.

**Changed**

- `src/App.tsx` — drop router/transport wiring; call `detectDevice()` and render
  the two views. Keep language + notice/toast handling.
- `src/session/phone-session.ts` — remove all transport code. `handleDecode`
  becomes: `decodeUpn` → `buildEpcPayload` → `addPayment` locally → stop scanner.
  Keep the scanner attach/detach lifecycle and the bad-read notice cooldown.
- `src/views/PhoneView.tsx` — remove `peerId`/`startPhoneSession`/connect step.
  On the `pay` step: render the EPC QR image, offer a gesture-driven
  "Save QR" (Share/download) button, keep "Open Revolut", `PaymentSummary`,
  and "Scan another".
- `src/session/store.ts` — drop `connected`, `peerId`, `transportError`. Keep
  `payments`, `cameraError`, `notice`, `lang`.
- `src/session/steps.ts` — `PhoneStep = 'scan' | 'pay'`, derived from
  `payments.length`. Remove `HostStep` and the `connect` step.
- `src/components/AppShell.tsx` / `Stepper.tsx` — 2 steps (Scan → Pay) instead
  of 3; drop the pairing step. Adjust only what the step-count change requires.
- `src/i18n/{en,sl}.ts` — remove pairing/connection/transport-error keys; add
  keys for the desktop handoff screen and the save/share instructions.
- `README.md` — rewrite for the single-device, offline model; drop the PeerJS /
  "why a second device" sections.

**Deleted**

- `src/transport/` (all: `peerjs-transport.ts`, `protocol.ts`, `peer-id.ts`,
  `types.ts`, and their tests).
- `src/session/host-session.ts`.
- `src/views/HostView.tsx`.
- `src/router.ts` and `src/router.test.ts`.
- `peerjs` from `package.json` dependencies.

**Kept unchanged**

- `src/core/upn.ts`, `src/core/epc.ts`, `src/core/payment.ts` and their tests.
- `src/session/scanner.ts`.
- `src/components/PaymentSummary.tsx`, `LanguageToggle.tsx`, `ui/*`.

(`QrCode.tsx` is refactored to consume `qr-image.ts` but keeps the same rendered
output — listed under Changed above.)
- `src/session/revolut.ts` (the deep-link helper — still used on the phone after
  saving).

## Data flow (phone)

1. Camera decode fires `handleDecode(text)`.
2. `decodeUpn(text)` — non-UPN frames stay silent; malformed → notice toast.
3. `buildEpcPayload(payment)` — missing IBAN / bad amount → notice toast.
4. On success: `addPayment({ id, epc, payment })`; scanner stops.
5. `PhoneView` renders the `pay` step: EPC QR image on-screen + "Save QR" button.
6. User taps "Save QR" → `saveQrImage(epcQrPngBlob(epc))` → share sheet / download.
7. User taps "Open Revolut" (existing deep link) and imports the saved image.
8. "Scan another" → `resetPayments()` → back to `scan`.

## Error & edge handling

- **Camera errors** — unchanged (`denied` / `not-found` / `insecure-context` /
  `unknown`), same retry UI.
- **Bad/duplicate reads** — unchanged cooldown; ignore new decodes once a payment
  exists.
- **Share unsupported / cancelled** — fall back to anchor download; the on-screen
  image is always present so long-press-to-save works regardless.
- **iOS "download goes to Files not Photos"** — mitigated by preferring Share
  (which offers "Save Image" → Photos) and by the always-visible image fallback.
- **Desktop URL QR** — encodes the current URL minus any `?device=` override.

## Testing

- `src/device.test.ts` (new) — detection heuristic + `?device=` override, via
  injected navigator/matchMedia doubles.
- `src/core/qr-image.test.ts` (new) — `epcQrPngBlob` returns a non-empty
  `image/png` blob for a valid payload (canvas mocked as needed under jsdom).
- `src/session/steps.test.ts` — updated to the 2-step phone model; host cases
  removed.
- Delete `router.test.ts`, `transport/*.test.ts`, `session/revolut.test.ts` stays.
- Core `upn`/`epc`/`payment` tests unchanged.
- **Manual** — real iOS Safari and Android Chrome: scan a UPN bill, Save QR,
  confirm it reaches a place Revolut can import from, and complete an import.
  Cannot be automated.

## Risks

- **Gallery landing is browser-dependent.** No API guarantees a file lands in the
  Photos library. Accepted: Share-first + visible-image fallback is best-effort,
  same posture as the existing best-effort Revolut deep link. Verified by hand.
- **Auto/programmatic download off a non-gesture path is blocked on iOS.** Hence
  save is always triggered from the button tap, never from the decode callback.
- **Device detection is heuristic.** Edge devices (touch laptops, iPad reporting
  as desktop Safari) may branch "wrong"; the `?device=` override and the
  scannable desktop QR both provide an escape hatch.
