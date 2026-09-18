# 2upn2revolut — Revolut UI redesign

**Date:** 2026-09-17
**Status:** Approved for planning
**Revision:** updated after this branch was rebased onto the phone-only offline
rework (`v2`). `DesktopView` replaces the pairing `HostView`, and the phone flow is
now scan → save → open Revolut. The flow, state and module decisions of the
2026-09-07 specs stand; this document supersedes only their visual direction.
**Supersedes:** the "Visual direction" section of
`docs/superpowers/specs/2026-08-24-2upn2revolut-design.md` and the surface/layout
notes in `2026-09-07-phone-only-rework-design.md` /
`2026-09-07-desktop-image-mode-design.md` where they conflict (everything else in
those documents still holds)

## Goal

Reskin and restructure the interface so it reads unmistakably as the Revolut app,
without touching the working conversion/QR pipeline.

- Adopt Revolut's brand language: type, colour, pill geometry, two-mode canvas.
- Support Revolut **dark** and **light**, following the system preference.
- Restructure the screens (one canvas design on both devices: a single-column handset
  layout and a two-column conversion/hand-off desktop input), not just recolour them.
- Leave `core/`, `session/`, `device.ts` and i18n strings untouched.

## Non-goals

- No new features, routes, or state. The phone's scan → convert → save → open Revolut
  chain and the desktop's image → EPC QR chain are unchanged.
- No new i18n strings (all copy reuses existing keys).
- No change to QR payloads, deep-link behaviour, the camera lifecycle, or `?device=`
  detection.
- No clone of Revolut's navigation (bottom tab bar, account cards) — the app has one
  job and no accounts.

## Research summary

Sourced from Revolut's Open Banking brand guidelines, the RUI product token
extractions (Refero, getdesign.md, shadcn.io), CoType/Typewolf (Aeonik), plus direct
pixel sampling of the three reference screenshots.

**Typography.** Revolut runs a two-family stack: **Aeonik Pro** at weight **500** for
all display sizes (authority comes from size and negative tracking, never from weight),
and **Inter** 400/600 for body and UI, with small positive tracking on uppercase
labels. A licensed copy of Aeonik Pro is bundled here (Regular 400 + Medium 500 — see
`src/assets/fonts/`), so the app runs the real brand face rather than a substitute.

**Colour.** Official core palette: White `#FFFFFF`, Black `#000000`, UI Black
`#161618`, Deep Blue `#1326FD`, Mid Blue `#6FA0FF`, Light Blue `#C6D9FD`, Mid Purple
`#A7AAF8`, Light Purple `#CACCFB`, Purple `#9539F2`, Lime `#BFFF37`. Product/RUI
tokens: cobalt violet `#494FDF`, action blue `#4F55F1`, ink `#191C1F`, surface-soft
`#F4F4F4`, mute `#505A63`, faint `#C9C9CD`, hairline `#E2E2E7`. Sampled from the
screenshots: app-home violet gradient `#530DFC → #7F19FE`; login canvas `#000D19`
with a blue radial glow (`#022442`); checkout canvas `#F7F8F8` with `#EBEDED` selected
rows and `#D3D5D7` hairlines.

**Shape and elevation.** Pill (`9999px`) on every control. Radii 12px small, 20px
cards, 28px sheet/mockup. Brand surfaces carry no drop shadow; depth comes from canvas
switching and surface-luminance steps. Product cards may take a soft elevation.

**Layout.** Two-mode canvas — dark "storytelling" bands against white "catalogue"
bands, full-bleed. Generous targets: 56px fields, 48px buttons, 4px spacing base.

## Type decision

**Aeonik Pro**, self-hosted from `src/assets/fonts/` and declared with `@font-face` in
`src/index.css`. The two licensed `.woff2` files ship in the repository, so `index.html`
loses its Google Fonts `<link>` and preconnects and the app makes no third-party font
request.

- `--font-display`: **Aeonik Pro** at weight **500** (Medium) with negative tracking.
- `--font-sans`: **Aeonik Pro** at 400 (Regular) and 500 (Medium).

The family ships only those two weights, so the 600 weight of Revolut's Inter-based UI is
mapped to Medium (500) and nothing is synthesized — `font-synthesis: none` makes a stray
bold render as Medium rather than faux-bold. `tabular-nums` on amounts and IBAN.

## Design tokens

Defined once in `src/index.css` as raw custom properties on `:root`, flipped in
`@media (prefers-color-scheme: dark)`, and surfaced to Tailwind through
`@theme inline`. Existing token names (`canvas`, `surface`, `ink`, `muted`, `line`,
`accent`) are kept to limit churn; new ones are added.

### Semantic (theme-aware)

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `canvas` | `#F7F8F8` | `#000000` | page background |
| `surface` | `#FFFFFF` | `#161618` | cards, sheets |
| `surface-soft` | `#F4F4F4` | `#1F2126` | inputs, soft buttons |
| `ink` | `#191C1F` | `#FFFFFF` | primary text, CTA fill |
| `muted` | `#505A63` | `rgba(255,255,255,.72)` | secondary text |
| `faint` | `#C9C9CD` | `#8D969E` | tertiary / disabled |
| `line` | `#E2E2E7` | `rgba(255,255,255,.12)` | borders, dividers |
| `on-ink` | `#FFFFFF` | `#191C1F` | label on an `ink` fill |
| `accent` | `#494FDF` | `#7F84F6` | brand cobalt |
| `accent-ink` | `#FFFFFF` | `#0F1028` | label on accent |
| `success` | `#00A87E` | `#00A87E` | positive state |
| `danger` | `#E23B4A` | `#E23B4A` | destructive / error |
| `warning` | `#EC7E00` | `#EC7E00` | warning |

`ink` + `on-ink` gives the primary CTA for free and auto-inverts: `bg-ink text-on-ink`
is a black pill in light and a white pill in dark, matching Revolut's inverse CTA.

`--shadow-card` is defined per theme (soft in light, near-none in dark) and exposed as
`shadow-card`.

### Radii and fonts

`--radius-field: 12px`, `--radius-card: 20px`, pill via
`rounded-full`. `--font-display: 'Aeonik Pro', …`, `--font-sans: 'Aeonik Pro', …`.

## Typography scale

| Role | Size / weight / tracking |
| --- | --- |
| Display XL | 48px / 500 / −0.03em (desktop headline) |
| Display L | 40px / 500 / −0.03em |
| Heading L | 32px / 500 / −0.02em |
| Heading M | 24px / 500 / −0.02em |
| Heading S | 20px / 500 / −0.01em |
| Body L | 18px / 400 / 1.56 |
| Body M | 16px / 400 / 1.5 |
| Body S | 14px / 400 / 1.43 |
| Caption | 13px / 400 |

Uppercase labels carry `+0.15em` tracking. `body` sets `font-sans` and antialiasing;
headings opt into `font-display`.

## Components

- **Button** (`ui/button.tsx`) — pill. Variants: `default` (`bg-ink text-on-ink`),
  `accent`, `soft` (`bg-surface-soft`), `outline` (`border-line`), `ghost`. Sizes
  `sm` 36px, `default` 48px, `lg` 56px, `icon` 44px.
- **Card** (`ui/card.tsx`) — 20px radius, `border-line`, `bg-surface`, `shadow-card`;
  keeps `CardContent`.
- **Badge** (`ui/badge.tsx`) — pill chip, unchanged markup; the token swap carries the
  retheme. It carries the "EPC code ready" status chip on the result screens.
- **QrCode** (`components/QrCode.tsx`) — white card, 20px radius, `shadow-card`; the
  one component renders all three in-app codes (the EPC QR, the `revolut://` deep-link
  QR on the desktop result, and the app-URL hand-off QR on the desktop input).
  **Correctness preserved:** white background and 4-module quiet zone in both themes,
  black-on-white rendering unchanged.
- **StepStatus** (new `components/StepStatus.tsx`, replaces `Stepper.tsx`) — a static
  progress indicator, not a control: a filled dot + full-contrast label for the current
  step, a hollow dot + muted label for the other, separated by a hairline. Labels are
  `step.scan` → `step.pay` derived from the same `activeIndex`. It deliberately avoids
  the segmented-control language of `LanguageToggle` so it can never read as clickable.
  Desktop shows the same two labels: uploading an image is the desktop analogue of
  scanning.
- **PaymentSummary** (`components/PaymentSummary.tsx`) — restructured from a `<dl>` into
  Revolut transaction-detail rows: circular initial avatar, label/value rows,
  `tabular-nums` on values, still filtered to non-empty fields.
- **LanguageToggle** — pill segmented control, the only interactive one in the app.
- **AppHeader** (new `components/AppHeader.tsx`) — wordmark + `LanguageToggle`; shared by
  both views so phone and desktop carry identical chrome.
- **Footer** — both views close with the `StepStatus` row centred at the bottom of the
  page (safe-area bottom padding on the phone).
- **AppShell** — reduced to the theme canvas and a `children` slot. Views own their
  headers, step status and footers; the `activeIndex`/`onStepChange` plumbing in
  `App.tsx` is removed since each view derives its own step (`phoneStep`,
  `currentPayment`) and places `StepStatus` itself.
- **Toaster** and **Tooltip** need no edits — both already paint from the semantic
  tokens (`bg-surface`, `text-ink`, `border-line`), so the token swap restyles them.

## Screens

Device branching is `detectDevice()`'s call and is unchanged; each view below is one
side of it.

### Desktop (DesktopView)

Canvas `canvas`, with a decorative blue radial glow (`.canvas-glow`) in **dark** only;
light is the white catalogue. A header carries the wordmark and `LanguageToggle`; the
`StepStatus` row sits in a centred footer at the bottom of the page.

`currentPayment(state)` drives the two screens: no payment is **input**, a payment is
**result**.

- **Input** — two-column (stacks under `lg`): left is the conversion block — headline
  (`desktop.uploadTitle`), instruction (`desktop.uploadInstruction`), and the
  dashed-border drop zone holding the `Choose image` button (`desktop.uploadButton`),
  the hint (`desktop.uploadHint`), the busy line (`desktop.decoding`) and any inline
  ingest error (`error.noQrInImage`, `error.notUpn`, `error.upnMalformed`,
  `error.epcAmount`, `error.epcIban`); right is the phone hand-off — the
  `desktop.orPhoneTitle` heading over the app-URL `QrCode` (`desktop.qrLabel`,
  `desktop.qrHint`). Upload, paste and drop all route through the one handler; the
  redesign is layout and skin only.
- **Result** — centred: a ready chip (`phone.ready`), the large EPC QR
  (`desktop.epcQrLabel`, 240px) above `desktop.resultInstruction`, the smaller
  `revolut://` QR (`desktop.revolutQrLabel`, 150px) with `desktop.revolutQrCaption`,
  the `PaymentSummary` card, and an outline `Convert another`
  (`desktop.convertAnother`) that resets to input.

### Phone (PhoneView)

The same canvas as desktop — `canvas-glow bg-canvas`, `AppHeader`, a centred single
column, and the same bottom `StepStatus` footer — so a handset sees the identical
workspace, only narrower.

- **Scan** — headline (`phone.scanTitle`), instruction (`phone.scanInstruction`), then
  the live camera `<video>` in a rounded 20px frame, or the styled camera-error state
  (`phone.cameraDenied` / `cameraNotFound` / `cameraInsecure`, `phone.cameraDeniedHelp`,
  `phone.cameraRetry`).
- **Pay** — the desktop result structure: a ready chip (`phone.ready`), the EPC QR as the
  primary artifact (`phone.saveInstruction` label, 240px), `phone.saveHelp`, the primary
  `Save EPC code` button (`phone.saveButton`), `phone.payInstruction`, the
  `Open Revolut` button (`phone.openRevolut`) or the `phone.revolutFailed` fallback plus
  `phone.revolutStore` link, the `PaymentSummary` card, and the `phone.scanAnother` soft
  button.

The save must run straight off the tap (iOS blocks share/download otherwise); the
on-screen QR is always present as the long-press fallback. The camera `<video>` keeps
`playsInline`, `muted`, and its accessible label. The Revolut deep link still fires
only from a direct tap.

## Accessibility

- `:focus-visible` ring uses `accent`, 2px, offset 2px.
- `aria-current="step"` sits on the active `StepStatus` label; the dots and separator
  are `aria-hidden`.
- The QR canvases keep `role="img"` and an `aria-label`; the camera `<video>` keeps
  its `phone.scanTitle` label.
- Motion is limited to colour/opacity transitions; no new animation.

## Verification

- `pnpm test` — existing `core/`, `session/` (ingest, revolut, save, steps), `device`
  and `i18n` suites must stay green; no tests are deleted.
- `pnpm typecheck`, `pnpm build`.
- Manual, in the preview browser: both views are reachable at will via
  `?device=desktop` / `?device=phone`; desktop dark + light (input, result), phone dark
  + light (scan, pay), at desktop and phone viewport widths; screenshots captured for
  review.
- Confirm the EPC, hand-off and `revolut://` QRs still scan (white card, quiet zone
  intact) and camera states render.

## Risks

- **Licensed type.** Aeonik Pro is committed to this repository, so its redistribution is
  bounded by the web licence held for the project. The family ships only Regular and
  Medium: 600-weight UI is mapped to Medium, and no weight is synthesized.
- **Interface churn.** `AppShell`/`App` lose the `activeIndex` plumbing; contained to
  two files and covered by typecheck. Because `?device=` can force either view at any
  viewport, both must hold up at phone *and* desktop widths (the desktop input stacks
  under `lg`).

## Files touched

`index.html` (Google Fonts links removed), `src/index.css`, `src/App.tsx`,
`src/components/AppShell.tsx`,
`src/components/{AppHeader,LanguageToggle,PaymentSummary,QrCode,StepStatus}.tsx`,
`src/components/ui/{button,card}.tsx`, `src/views/{DesktopView,PhoneView}.tsx`, and
`src/assets/fonts/AeonikPro-{Regular,Medium}.woff2`; `Stepper.tsx`, `Hero.tsx` and
`Sheet.tsx` deleted. No changes to `core/`, `session/`, `device.ts`, `i18n/`.
