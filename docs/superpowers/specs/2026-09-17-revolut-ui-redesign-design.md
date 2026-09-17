# 2upn2revolut — Revolut UI redesign

**Date:** 2026-09-17
**Status:** Approved for planning
**Supersedes:** the "Visual direction" section of
`docs/superpowers/specs/2026-08-24-2upn2revolut-design.md` (everything else in that
document still holds)

## Goal

Reskin and restructure the interface so it reads unmistakably as the Revolut app,
without touching the working pairing/QR pipeline.

- Adopt Revolut's brand language: type, colour, pill geometry, two-mode canvas.
- Support Revolut **dark** and **light**, following the system preference.
- Restructure the screens (gradient hero + sheet on the phone, two-column login-style
  desktop), not just recolour them.
- Leave `core/`, `transport/`, `session/` and i18n strings untouched.

## Non-goals

- No new features, routes, or state. The Pair → Scan → Pay derivation is unchanged.
- No new i18n strings (all copy reuses existing keys).
- No change to QR payloads, deep-link behaviour, or the camera lifecycle.
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

### Brand constants (theme-independent)

| Token | Value | Role |
| --- | --- | --- |
| `hero-from` | `#530DFC` | gradient start |
| `hero-to` | `#7F19FE` | gradient end |

The violet hero is the app signature and stays vivid in both modes; only the surface
beneath it flips. `--shadow-card` is defined per theme (soft in light, near-none in
dark) and exposed as `shadow-card`.

### Radii and fonts

`--radius-field: 12px`, `--radius-card: 20px`, `--radius-sheet: 28px`, pill via
`rounded-full`. `--font-display: 'Aeonik Pro', …`, `--font-sans: 'Aeonik Pro', …`.

## Typography scale

| Role | Size / weight / tracking |
| --- | --- |
| Display XL | 48px / 500 / −0.03em (desktop headline) |
| Display L | 40px / 500 / −0.03em |
| Display M (phone amount) | 48px / 500 / −0.035em, tabular |
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
  `accent`, `soft` (`bg-surface-soft`), `outline` (`border-line`), `ghost`, and a
  `hero` variant (translucent white, for on-gradient use). Sizes `sm` 36px, `default`
  48px, `lg` 56px, `icon` 44px.
- **Card** (`ui/card.tsx`) — 20px radius, `border-line`, `bg-surface`, `shadow-card`.
  Adds `CardHeader` and `CardTitle`.
- **Badge** (`ui/badge.tsx`) — pill chip; variants `accent`, `success`, `neutral`,
  `hero`.
- **QrCode** (`components/QrCode.tsx`) — white card, 20px radius, `shadow-card`.
  **Correctness preserved:** white background and 4-module quiet zone in both themes,
  black-on-white rendering unchanged.
- **StepPills** (new `components/StepPills.tsx`, replaces `Stepper.tsx`) — three pill
  segments derived from the same `activeIndex`; `tone="hero"` for on-gradient use.
- **PaymentSummary** (`components/PaymentSummary.tsx`) — restructured from a `<dl>` into
  Revolut transaction-detail rows: circular initial avatar, label/value rows,
  `tabular-nums` on values.
- **LanguageToggle** — pill segmented control; `tone` prop for hero placement.
- **Hero** (new `components/Hero.tsx`) — violet gradient band with a soft radial
  highlight; composes a header row, a headline block, and optional centre content.
- **Sheet** (new `components/Sheet.tsx`) — `bg-surface`, 28px top radius, negative top
  margin so it overlaps the hero; safe-area bottom padding.
- **Spinner** (new, inline in view or small component) — gradient-agnostic ring.
- **AppShell** — reduced to the theme canvas and a `children` slot. Views own their
  headers and step pills; the `activeIndex`/`onStepChange` plumbing in `App.tsx` is
  removed since each view derives its own step.
- **Toaster** and **Tooltip** retheme to the new tokens.

## Screens

### Desktop (HostView)

Canvas `canvas`, with a decorative blue radial glow (`.canvas-glow`) in **dark** only;
light is the white catalogue. A header carries the wordmark, `StepPills`, and
`LanguageToggle`.

- **Pair** — two-column (stacks under `lg`): left is the headline (`host.pairTitle`),
  subtext (`host.pairInstruction`), a connection-status chip (`host.pairPending`), and
  the hint (`host.pairHint`); right is the pairing QR card.
- **Waiting** — centred: a connected chip (`host.waitingTitle`) above a large headline
  (`host.waitingInstruction`).
- **Display** — centred: headline (`host.displayTitle`), instruction
  (`host.displayInstruction`), the large EPC QR, a `PaymentSummary` card, and, when more
  than one payment exists, the recent thumbnails as a rail (`host.recent`).

The coarse-pointer warning (`host.mobileWarning`) renders as a chip above the headline.

### Phone (PhoneView)

`Hero` over `Sheet`, the signature screenshot-2 structure.

- **Connect** — hero: `phone.connectingTitle` with a spinner; sheet:
  `phone.connectingInstruction`.
- **Scan** — hero: `phone.scanTitle`; sheet: the live camera `<video>` in a rounded
  20px frame, `phone.scanInstruction`, and the styled camera-error state
  (`phone.cameraDenied` / `cameraNotFound` / `cameraInsecure`, `phone.cameraDeniedHelp`,
  `phone.cameraRetry`).
- **Pay** — hero: `phone.sent` as the eyebrow, the **amount** as the large display
  number (Revolut balance treatment), and a translucent pill with the recipient name;
  sheet: the primary `Open Revolut` button (or the `phone.revolutFailed` fallback plus
  `phone.revolutStore` link), the `phone.payInstruction` caption, the two instruction
  images as cards labelled `phone.epcInstructions`, a `PaymentSummary` card, and the
  `phone.scanAnother` soft button.

The camera `<video>` keeps `playsInline`, `muted`, and its accessible label. The
Revolut deep link still fires only from a direct tap.

## Accessibility

- `:focus-visible` ring uses `accent`, 2px, offset 2px.
- `aria-current="step"` moves from the old dots to the active `StepPills` segment.
- Hero text stays ≥4.5:1 on the gradient (`#530DFC`→`#7F19FE` against white).
- The QR canvas keeps `role="img"` and an `aria-label`.
- Motion is limited to colour/opacity transitions; no new animation.

## Verification

- `pnpm test` — existing `core/`, `transport/`, `session/`, `router` suites must stay
  green; no tests are deleted.
- `pnpm typecheck`, `pnpm build`.
- Manual, in the preview browser: desktop dark + light (pair, waiting, display), phone
  dark + light (connect, scan, pay), at desktop and phone viewport widths; screenshots
  captured for review.
- Confirm the QR still scans (white card, quiet zone intact) and camera states render.

## Risks

- **Licensed type.** Aeonik Pro is committed to this repository, so its redistribution is
  bounded by the web licence held for the project. The family ships only Regular and
  Medium: 600-weight UI is mapped to Medium, and no weight is synthesized.
- **Dark phone sheet.** The gradient hero sits on a `#161618` sheet in dark; contrast
  is high, but this is the least "screenshot-verified" surface, so it gets the most
  visual review.
- **Interface churn.** `AppShell`/`App` lose the `activeIndex` plumbing; contained to
  two files and covered by typecheck.

## Files touched

`index.html`, `src/index.css`, `src/App.tsx`, `src/components/AppShell.tsx`,
`src/components/LanguageToggle.tsx`, `src/components/PaymentSummary.tsx`,
`src/components/QrCode.tsx`, `src/components/ui/{button,card,badge,toaster,tooltip}.tsx`,
`src/views/{HostView,PhoneView}.tsx`, plus new `src/components/{Hero,Sheet,StepPills}.tsx`
and `src/assets/fonts/AeonikPro-{Regular,Medium}.woff2`;
`Stepper.tsx` deleted. No changes to `core/`, `transport/`, `session/`, `i18n/`.
