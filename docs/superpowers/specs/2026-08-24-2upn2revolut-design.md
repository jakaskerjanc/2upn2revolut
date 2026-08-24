# 2upn2revolut — Design

**Date:** 2026-08-24
**Status:** Approved for planning
**Supersedes:** the `upn-2-revolut` prototype (Vue 3 + hand-rolled `ws` relay)

## Problem

Revolut can scan EPC (SEPA) QR codes but not Slovenian UPN QR codes. The prototype
bridges this: a phone scans the UPN QR on a paper bill, converts it to EPC, and relays
it to a desktop screen, which displays the EPC QR large enough for the Revolut app on
that same phone to scan.

The prototype works but has three blocking problems:

1. It requires a self-hosted WebSocket relay (`server/index.ts`), so it cannot be
   deployed as a static site.
2. Camera access requires HTTPS, forcing every user through an mkcert or ngrok setup.
3. Pairing requires reading a 4-character code off the desktop and typing it into the
   phone, and the entire UI lives in a single 483-line `App.vue`.

## Goals

- Deploy as a fully static site on GitHub Pages, with no server to operate.
- Pair with zero typing.
- A UI that teaches the flow as you use it, rather than requiring a README.
- Domain logic isolated and unit-tested.

## Non-goals

Explicitly out of scope for this rewrite:

- Desktop-only paste fallback (see Risks — this is the accepted cost of the transport choice)
- PWA / offline support
- Playwright end-to-end tests
- A linter/formatter toolchain
- A separate CI workflow distinct from deploy
- Persisted payment history beyond the in-memory last five

## Decisions

| Area | Choice |
| --- | --- |
| Repo | `2upn2revolut`, fresh directory, no carried git history |
| Transport | PeerJS over the public broker, behind a `Transport` interface |
| Framework | React 19 + Vite |
| Styling | Tailwind v4 (`@theme` tokens) + shadcn/ui, rethemed off stock |
| Package manager | pnpm |
| Tests | Vitest over `core/` only |
| Deploy | GitHub Actions → GitHub Pages |
| Theme | Follows system theme on both devices |
| Languages | Slovenian (default) + English |

## Architecture

### Layering

```
src/
├─ core/          pure domain. no DOM, no React, no network
├─ transport/     peer connection + wire protocol
├─ session/       app state, step derivation, camera lifecycle
├─ i18n/          typed string records
├─ components/    presentational React
└─ views/         route-level React (HostView, PhoneView)
```

Two invariants keep the layering honest:

- `core/` and `transport/` never import React.
- `session/` never imports a component.

Everything imperative and long-lived — the PeerJS peer and the camera scanner — lives
**outside** the React tree as plain TypeScript managers, exposed to components through
a store consumed via `useSyncExternalStore`. This is deliberate: React 19 StrictMode
double-mounts effects in development, and driving a WebRTC handshake or a `getUserMedia`
stream from `useEffect` tears it down mid-flight. Views may remount freely; the peer and
the camera do not care.

### `core/` — domain

The canonical payment type. **Amount is integer cents**, converted exactly once at the
UPN boundary:

```ts
interface Payment {
  name: string;          // creditor name
  iban: string;
  amountCents: number;   // integer. 12345 === EUR 123.45
  purposeCode: string;   // AT-44, 4 chars
  reference: string;     // verbatim from the bill, e.g. "SI00 1234-5678" or "RF18 5390"
  remittance: string;    // free-text payment purpose
}
```

Rationale: `upnqr`'s `parseAmount` already divides the raw 11-digit field by 100, so
`decode()` returns euros as a float, while the prototype's `normalizeAmount` also
accepted digit-strings and divided *those* by 100 — meaning a legitimate `"100"` became
`1.00`. Integer cents removes the string-or-number ambiguity that commit `b523e43` was
working around, and makes rounding testable.

**`core/upn.ts`** wraps `upnqr.decode` and maps its output to `Payment`.
`upnqr` emits exactly one field name per value, so the prototype's speculative
multi-key fallback lists are dropped:

| UPN field | `Payment` field |
| --- | --- |
| `ime_prejemnika` | `name` |
| `IBAN_prejemnika` | `iban` |
| `znesek` (euro float) | `amountCents` via `Math.round(znesek * 100)` |
| `koda_namena` | `purposeCode` |
| `referenca_prejemnika` | `reference` |
| `namen_placila` | `remittance` |

`decode` throws `UPNQRError` on a bad checksum, an invalid amount, or a payload over
411 characters. `core/upn.ts` surfaces this as a discriminated result
(`{ ok: true, payment } | { ok: false, reason }`) rather than throwing, so the scanner
can distinguish "this QR is not a UPN QR, keep scanning" from "this UPN QR is
malformed, tell the user".

`upnqr` ships no types. A minimal `upnqr.d.ts` declares the named exports
(`decode`, `encode`, `UPNQRError`); the prototype's `default?.decode` fallback is
unnecessary — it is a plain CommonJS named export.

**`core/epc.ts`** builds the EPC 12-line BCD/SCT payload:

```
1  BCD          8   EUR<amount>
2  002          9   <purpose code>
3  1            10  <structured creditor reference>
4  SCT          11  <unstructured remittance>
5  <BIC>        12  <beneficiary-to-originator info>
6  <name>
7  <IBAN>
```

Version `002` is correct and load-bearing: UPN carries no BIC, and only version 002
permits an empty BIC field.

Reference routing: only ISO 11649 references (`RF` + 2 check digits) are valid in the
structured field 10. Slovenian `SI`-model references are **not** ISO 11649 and must go
to the unstructured field 11.

Change from the prototype: when a reference lands in the unstructured field, it is
placed **first**, ahead of the remittance text — `"SI00 1234-5678 Plačilo računa"`
rather than the prototype's `"Plačilo računa | SI00 1234-5678"`. The creditor
reconciles on the reference, and field 11 truncates at 140 characters; the reference
must never be the part that gets cut.

Field limits enforced on build: name 70, IBAN 34, purpose 4, structured reference 35,
unstructured remittance 140. Amount must fall within EPC's 0.01–999999999.99.

### `transport/` — pairing and messaging

```ts
interface Transport {
  host(): Promise<string>;                       // returns peer id
  join(peerId: string): Promise<void>;
  send(msg: WireMessage): void;
  subscribe(fn: (e: TransportEvent) => void): () => void;
  close(): void;
}
```

`peerjs-transport.ts` is the only implementation. Swapping brokers later touches one file.

**Peer IDs** are self-assigned and namespaced: `upn-` plus 10 random lowercase
alphanumerics. Self-assignment keeps the pairing URL short; the namespace avoids
collisions with other applications sharing the public broker. (PeerJS permits
alphanumerics, `-`, and `_` in IDs.)

**Wire protocol** — deliberately two messages, both validated with zod on receipt so a
malformed or hostile frame from the broker cannot corrupt state:

```ts
{ v: 1, type: 'hello',   role: 'phone' }
{ v: 1, type: 'payment', epc: string, payment: Payment }
```

There is no step-synchronisation message. Each side **derives** its own step from local
connection state plus last payment, so the two devices can never disagree about a step
they were separately told about.

**Error handling.** Each PeerJS error type maps to a distinct localized message:

| PeerJS error | Meaning shown to user |
| --- | --- |
| `peer-unavailable` | The desktop page was closed — reopen it and scan again |
| `browser-incompatible` | This browser cannot do WebRTC |
| `network` / HTTP 429 | Pairing service unavailable, retrying (exponential backoff) |
| `unavailable-id` | Internal; regenerate the ID and retry silently |

Transient drops call `peer.reconnect()`.

### `session/` — state and steps

`store.ts` holds the single app state object and notifies `useSyncExternalStore`
subscribers. `steps.ts` derives the current step:

```
desktop:  no peer connected  → pair
          connected          → waiting
          payment received   → display

phone:    not connected      → connect
          connected          → scan
          payment sent       → pay
```

`scanner.ts` wraps `@zxing/browser`'s `BrowserQRCodeReader` as an imperative
start/stop manager (QR-only, not multi-format). It keeps scanning through decode
failures — a non-UPN QR in frame is not an error state. If iOS Safari proves
unreliable in practice, the fallback is the `barcode-detector` ponyfill over
`zxing-wasm`; this is not built up front.

Camera access needs a secure context. GitHub Pages is HTTPS, so the prototype's entire
mkcert/ngrok requirement disappears.

### Routing

Two hash routes, served by a ~30-line hand-rolled router (React Router is not worth
its weight at this size). Hash routing also means GitHub Pages needs no `404.html`
SPA-fallback hack:

| Route | View |
| --- | --- |
| `#/` | Host (desktop) — immediately begins pairing |
| `#/p/:peerId` | Phone — joins that peer |

There is no role picker. Opening the site makes you the host; the phone only ever
arrives through the pairing link, so the role is implicit in the URL.

Guard: if `#/` is opened on a coarse-pointer device, the host view shows
"Open this page on a computer, then scan its code with this phone" above the pairing
QR — a phone hosting a QR it cannot scan itself is the one dead end this design can
produce.

## User flow

```
DESKTOP  opens site → peer id → shows pairing QR encoding
                                https://…/#/p/upn-abc123xyz
                                        │
PHONE    scans that with its NATIVE camera app (no install, no typing)
         → opens already paired → camera live
                                        │
PHONE    scans the UPN QR on the bill → converts → sends
                                        │
DESKTOP  swaps pairing QR for the EPC QR, full size
PHONE    "Now scan your screen with Revolut" + deep-link button
```

Two scans, zero typing.

### Opening Revolut from the phone

Revolut publishes **no consumer deep-link scheme**. Their developer documentation
covers only merchant-side Revolut Pay SDK return URIs; there is no documented path that
opens the QR scanner. The prototype's `revolut://app/payments` is an unverified guess.

The button is therefore built as explicitly best-effort:

- **Default link** is the bare scheme `revolut://`, which is far likelier to be
  registered than an invented path. It is overridable at build time via
  `VITE_REVOLUT_DEEPLINK` and per-session via `?revolut=` on the phone URL, so a working
  link can be adopted without a code change if one is found.
- **Must fire from a direct tap.** iOS blocks programmatic navigation to custom schemes,
  so the link is never followed automatically on entering the `pay` step.
- **Failure detection.** An unregistered custom scheme fails silently on Android and
  raises a system error dialog on iOS. On tap, a ~1.5s timer plus a `visibilitychange`
  listener determines whether the page actually backgrounded. If it did not, the button
  is replaced with a store link and manual instructions rather than leaving the user
  staring at an unchanged screen.
- **Copy assumes the scanner is not reached.** Even a successful launch opens Revolut's
  home screen, not its scanner. The instruction is therefore explicit about the next
  physical action — open Revolut, tap Scan, point it at the desktop screen — and that
  guidance is shown regardless of whether the deep link fires. The button is an
  accelerator; the written step is the actual mechanism.

This keeps the feature useful where the scheme happens to work, and non-broken
everywhere else.

### Guidance: the synced step machine

Both devices render the same three-dot stepper (**Pair → Scan → Pay**) and each shows
only its own next action. The desktop advances the instant the data channel opens,
which is what makes the pairing feel like it worked. This replaces both a tour and a
connection-status indicator; there is nothing to dismiss, and the guidance cannot drift
out of sync with reality because it is derived from reality.

### Multiple bills

After sending, the phone offers "Scan another" and returns to the camera rather than
dead-ending. The desktop keeps the last five EPC QRs as clickable thumbnails beneath
the current one (in memory only; not persisted).

## Visual direction

The app's entire job is to display a QR big enough to scan and say what to do next.
The design follows from that: one focal element per screen, large type, generous
whitespace, no dashboard chrome.

shadcn/ui is rethemed away from its stock appearance — its defaults are recognisable
enough to read as a generic template. Specifically: a warm off-white / near-black base
rather than zinc, a single saturated accent, a larger radius, and a display-weight face
for the single instruction line paired with system sans for body text.

Both devices follow the system theme, with one hard constraint that overrides it:
**the QR code always sits on a white card in both themes.** Scanners depend on the
quiet zone, and this is a correctness requirement, not a stylistic one.

Components needed from shadcn: Button, Card, Badge, Sonner (toasts for transport
errors), Tooltip.

## Internationalisation

Slovenian is the default — UPN is a Slovenian payment format — with English available.
Roughly 40 strings, so this is a typed string record rather than i18next:

```ts
const sl = { 'pair.instruction': 'Skenirajte to kodo s telefonom', … } as const;
type Key = keyof typeof sl;   // en.ts must satisfy Record<Key, string>
```

Language is auto-detected from `navigator.language`, overridable by a header toggle,
and persisted to `localStorage`. Typing `en` against `keyof typeof sl` makes a missing
translation a compile error.

## Testing

Vitest over `core/` only, where the real edge cases are:

- **Amount:** euro-float → integer cents; rounding at the half-cent; zero and empty;
  the EPC 0.01–999999999.99 bounds.
- **Reference routing:** `RF`-prefixed → structured field 10; `SI`-model → unstructured
  field 11, positioned ahead of the remittance text.
- **Truncation:** each field at its EPC limit, and specifically that a long remittance
  never truncates the reference out of field 11.
- **UPN decode:** a valid fixture payload; a bad-checksum payload → `{ ok: false }`;
  a non-UPN string → `{ ok: false }`; an over-411-character payload → `{ ok: false }`.
- **EPC output:** exact 12-line structure, `002` version, empty BIC line preserved.
- **Protocol:** zod acceptance of valid frames, rejection of malformed and wrong-version ones.

## Build and deploy

pnpm, Vite 7, React 19, TypeScript strict, Tailwind v4 via `@tailwindcss/vite`,
shadcn/ui, Vitest.

`vite.config.ts` sets `base: '/2upn2revolut/'` for the Pages project subpath.

A single workflow, `.github/workflows/deploy.yml`, on push to `main`:

```
pnpm/action-setup → setup-node (pnpm cache)
  → pnpm install --frozen-lockfile
  → pnpm typecheck
  → pnpm test
  → pnpm build
  → actions/upload-pages-artifact
  → actions/deploy-pages
```

Permissions `pages: write`, `id-token: write`. There is no separate CI gate workflow;
typecheck and tests run inside the deploy job, before the build, so Pages never
publishes a build that does not compile or pass its tests.

## Risks

**The public PeerJS broker is a third-party single point of failure.** It has a
documented history of `429 Rate Limited` responses (peers/peerjs issues #471, #997) and
provides STUN but no TURN. In the expected setting — phone and desktop on the same
Wi-Fi — host candidates connect without TURN, so the NAT exposure is small. Broker
downtime is the real risk, and with the desktop paste fallback out of scope there is no
recovery path when it occurs; the app can only report the failure and retry with
backoff. This is an accepted trade-off. The `Transport` interface and the React-free
`core/` keep both mitigations cheap: swapping brokers is one file, and adding a paste
fallback later is roughly twenty lines against an already-tested `core/`.

**`@zxing/browser` is lightly maintained.** It is proven in the prototype, so it stays;
`barcode-detector` over `zxing-wasm` is the migration path if iOS Safari misbehaves.

**The Revolut deep link cannot be verified or guaranteed.** No consumer scheme is
documented, so the link may stop working — or may never work on a given platform —
without notice. The design absorbs this by treating the button as an accelerator over
written instructions that stand on their own, detecting launch failure, and keeping the
target overridable by env var and URL parameter.

**Self-assigned peer IDs share a namespace with every other public-broker user.** The
`upn-` prefix plus 10 random characters makes collision negligible, and PeerJS reports
`unavailable-id`, which is handled by regenerating.

## Migration from the prototype

Ported with rework: `src/lib/epc.ts` and `src/lib/upn.ts` become `core/`, restructured
around `amountCents` and the discriminated decode result.

Discarded: `server/index.ts` (the relay is replaced by WebRTC), `src/App.vue`,
`src/styles.css`, the session-code pairing UI, and the entire HTTPS-certificate section
of the README.
