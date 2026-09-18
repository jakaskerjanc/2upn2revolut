# Revolut UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin and restructure the app as the Revolut brand — self-hosted Aeonik Pro, Revolut tokens, pill geometry, and a hero + sheet phone layout with a two-column desktop — without touching conversion logic, i18n, or device detection.

**Architecture:** Swap the warm `oklch` theme in `src/index.css` for raw semantic custom properties flipped by `prefers-color-scheme` and surfaced through `@theme inline`; retheme the shared primitives; replace `Stepper` with two-segment `StepPills`; make `AppShell` a bare canvas and let each view own its layout (phone: `Hero` over `Sheet`; desktop: header + two-column input / centred result).

**Tech Stack:** React 19, TypeScript (strict), Vite 7, Tailwind v4.3 (`@theme inline`), vitest 4, self-hosted woff2 fonts. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-17-revolut-ui-redesign-design.md`

## Global Constraints

- **No new runtime dependency.** Everything is CSS, existing components, and the two vendored woff2 files in `src/assets/fonts/`.
- **Token names are preserved.** `canvas`, `surface`, `ink`, `muted`, `line`, `accent` keep their names; new ones (`surface-soft`, `faint`, `on-ink`, `accent-ink`, `success`, `danger`, `warning`, `hero-from`, `hero-to`) are added.
- **No new i18n keys and no i18n edits.** Every string reuses the existing keys exactly as written in this plan (`desktop.*`, `phone.*`, `error.*`, `step.*`, `payment.*`, `app.title`, `lang.label`). `src/i18n/` is not touched.
- **Do not touch** `src/core/`, `src/session/`, `src/device.ts`, `src/i18n/`.
- **QR correctness is untouchable.** `QrCode` keeps the white card, `errorCorrectionLevel: 'M'`, `margin: 4`, `#000000`-on-`#ffffff`, `role="img"` and its `aria-label`. Never restyle the card to a theme surface.
- **Camera behaviour is untouchable.** The `<video>` keeps `playsInline`, `muted`, and `aria-label={t('phone.scanTitle')}`. Save runs only from the tap; the Revolut deep link fires only from the tap.
- **Fonts.** Only the 400 and 500 woff2 files ship; `font-synthesis: none`; after this plan there is no request to `fonts.googleapis.com` / `fonts.gstatic.com`.
- **Verification convention.** There is no component-test harness (no RTL) in this repo; per the spec, the redesign is verified by `pnpm test` (existing suites stay green), `pnpm typecheck`, `pnpm build`, and manual preview checks. No tests are deleted.
- **Commit style.** Conventional commits, concise (matches existing history).
- **Motion.** Colour/opacity transitions only; no new animation.

---

### Task 1: Brand tokens, self-hosted Aeonik Pro, base styles

**Files:**
- Modify: `index.html` (delete the Google Fonts links)
- Modify: `src/index.css` (full replacement)

**Interfaces:**
- Consumes: `src/assets/fonts/AeonikPro-Regular.woff2`, `src/assets/fonts/AeonikPro-Medium.woff2` (already committed).
- Produces: Tailwind utilities used by every later task — `bg-canvas`, `bg-surface`, `bg-surface-soft`, `text-ink`, `text-muted`, `text-faint`, `border-line`, `bg-ink`/`text-on-ink`, `bg-accent`/`text-accent-ink`, `bg-danger`, `from-hero-from`, `to-hero-to`, `rounded-card`, `rounded-sheet`, `shadow-card`, `font-display`, `font-sans`; plus the `.canvas-glow` and `.hero-glow` background classes.

- [ ] **Step 1: Replace `index.html`** with the link-free version

```html
<!doctype html>
<html lang="sl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="light dark" />
    <title>2upn2revolut</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Replace `src/index.css`** with the Revolut token sheet

```css
@import 'tailwindcss';

@font-face {
  font-family: 'Aeonik Pro';
  src: url('./assets/fonts/AeonikPro-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Aeonik Pro';
  src: url('./assets/fonts/AeonikPro-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

:root {
  --canvas: #f7f8f8;
  --surface: #ffffff;
  --surface-soft: #f4f4f4;
  --ink: #191c1f;
  --muted: #505a63;
  --faint: #c9c9cd;
  --line: #e2e2e7;
  --on-ink: #ffffff;
  --accent: #494fdf;
  --accent-ink: #ffffff;
  --success: #00a87e;
  --danger: #e23b4a;
  --warning: #ec7e00;
  --hero-from: #530dfc;
  --hero-to: #7f19fe;
  --radius-field: 12px;
  --radius-card: 20px;
  --radius-sheet: 28px;
  --shadow-card: 0 8px 24px rgba(25, 28, 31, 0.06);
  --font-display: 'Aeonik Pro', ui-sans-serif, system-ui, sans-serif;
  --font-sans: 'Aeonik Pro', ui-sans-serif, system-ui, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --canvas: #000000;
    --surface: #161618;
    --surface-soft: #1f2126;
    --ink: #ffffff;
    --muted: rgba(255, 255, 255, 0.72);
    --faint: #8d969e;
    --line: rgba(255, 255, 255, 0.12);
    --on-ink: #191c1f;
    --accent: #7f84f6;
    --accent-ink: #0f1028;
    --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
}

@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-surface-soft: var(--surface-soft);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-faint: var(--faint);
  --color-line: var(--line);
  --color-on-ink: var(--on-ink);
  --color-accent: var(--accent);
  --color-accent-ink: var(--accent-ink);
  --color-success: var(--success);
  --color-danger: var(--danger);
  --color-warning: var(--warning);
  --color-hero-from: var(--hero-from);
  --color-hero-to: var(--hero-to);

  --radius-field: var(--radius-field);
  --radius-card: var(--radius-card);
  --radius-sheet: var(--radius-sheet);

  --shadow-card: var(--shadow-card);

  --font-display: var(--font-display);
  --font-sans: var(--font-sans);
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    background-color: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    font-synthesis: none;
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}

/* Blue radial glow behind the desktop canvas — dark mode only. */
@media (prefers-color-scheme: dark) {
  .canvas-glow {
    background-image: radial-gradient(
      70% 50% at 50% 0%,
      rgba(2, 36, 66, 0.9),
      transparent 70%
    );
  }
}

/* Soft radial highlight on the violet hero band. */
.hero-glow {
  background-image: radial-gradient(
    60% 45% at 50% 0%,
    rgba(255, 255, 255, 0.16),
    transparent 70%
  );
}
```

- [ ] **Step 3: Confirm no Google Fonts or old-theme references remain**

Run: `rg -n "fonts.googleapis|fonts.gstatic|Fraunces|oklch" index.html src`
Expected: no output.

- [ ] **Step 4: Tests, typecheck, build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all pass. (Components still render the old layout at this point; only the palette, radius, shadow, and font change.)

- [ ] **Step 5: Manual smoke check in the preview**

Run: `pnpm dev`, open `http://localhost:5173/2upn2revolut/`, then in DevTools:
- Network tab: hard reload, filter `font` — only `/assets/AeonikPro-*.woff2` requests, no `googleapis`/`gstatic`.
- Elements: `body` computed `font-family` starts with `Aeonik Pro`; light `background-color` is `rgb(247, 248, 248)` (`--canvas`), dark (emulate `prefers-color-scheme: dark`) is `rgb(0, 0, 0)`.
- The existing page still functions (header, content, footer dots).

- [ ] **Step 6: Commit**

```bash
git add index.html src/index.css
git commit -m "feat(ui): Revolut design tokens and self-hosted Aeonik Pro"
```

---

### Task 2: Retheme shared primitives (Button, Card, QrCode, LanguageToggle)

**Files:**
- Modify: `src/components/ui/button.tsx` (full replacement)
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/QrCode.tsx`
- Modify: `src/components/LanguageToggle.tsx` (full replacement)

**Interfaces:**
- Consumes: token utilities from Task 1.
- Produces:
  - `buttonVariants` with variants `default | accent | soft | outline | ghost | hero` and sizes `sm | default | lg | icon`.
  - `LanguageToggle({ tone?: 'default' | 'hero' })` — `tone` is required by Task 5.
  - `QrCode` unchanged props (`value`, `size`, `label`, `className`), now on `shadow-card`.

- [ ] **Step 1: Replace `src/components/ui/button.tsx`**

```tsx
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-ink text-on-ink hover:bg-ink/90',
        accent: 'bg-accent text-accent-ink hover:bg-accent/90',
        soft: 'bg-surface-soft text-ink hover:bg-line/60',
        outline: 'border border-line bg-surface text-ink hover:bg-canvas',
        ghost: 'text-muted hover:bg-line/40 hover:text-ink',
        hero: 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        default: 'h-12 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
```

- [ ] **Step 2: Add `shadow-card` to `Card`**

In `src/components/ui/card.tsx`, change the wrapper class to:

```tsx
      className={cn('rounded-card border border-line bg-surface text-ink shadow-card', className)}
```

- [ ] **Step 3: Move `QrCode` from `shadow-sm` to `shadow-card`**

In `src/components/QrCode.tsx`, change the wrapper element to:

```tsx
    <div className={cn('rounded-card bg-white p-4 shadow-card', className)}>
```

Leave the `qrcode` options (`errorCorrectionLevel: 'M'`, `margin: 4`, black on white), the detached-canvas paint, `role="img"` and `aria-label` untouched.

- [ ] **Step 4: Replace `src/components/LanguageToggle.tsx`** with the segmented control

```tsx
import { LANGUAGES } from '../i18n';
import { setLang, useAppState } from '../session/store';
import { useT } from '../session/useT';
import { cn } from '../lib/cn';

interface LanguageToggleProps {
  /** `hero` renders the on-gradient treatment. */
  tone?: 'default' | 'hero';
}

function LanguageToggle({ tone = 'default' }: LanguageToggleProps) {
  const { lang } = useAppState();
  const t = useT();
  const hero = tone === 'hero';

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={cn(
        'flex items-center gap-1 rounded-full p-1',
        hero ? 'bg-white/15' : 'bg-surface-soft',
      )}
    >
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.15em] uppercase transition-colors',
            lang === code
              ? hero
                ? 'bg-white text-hero-from'
                : 'bg-ink text-on-ink'
              : hero
                ? 'text-white'
                : 'text-muted hover:text-ink',
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export { LanguageToggle };
```

- [ ] **Step 5: Tests, typecheck, build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/card.tsx src/components/QrCode.tsx src/components/LanguageToggle.tsx
git commit -m "feat(ui): Revolut buttons, cards, QR frame, and language pills"
```

---

### Task 3: PaymentSummary as Revolut transaction rows

**Files:**
- Modify: `src/components/PaymentSummary.tsx` (full replacement)

**Interfaces:**
- Consumes: `payment.*` translation keys (unchanged), `formatEuros` from `../core/payment`, `Payment` type.
- Produces: unchanged public API `PaymentSummary({ payment }: { payment: Payment })`; now renders an initial-avatar recipient row above the label/value rows.

- [ ] **Step 1: Replace `src/components/PaymentSummary.tsx`**

```tsx
import { formatEuros, type Payment } from '../core/payment';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

interface PaymentSummaryProps {
  payment: Payment;
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/** Revolut transaction-detail rows: avatar + recipient, then label/value pairs. */
function PaymentSummary({ payment }: PaymentSummaryProps) {
  const t = useT();

  const rows: Array<[TranslationKey, string]> = [
    ['payment.iban', payment.iban],
    ['payment.amount', `EUR ${formatEuros(payment.amountCents)}`],
    ['payment.reference', payment.reference],
    ['payment.remittance', payment.remittance],
    ['payment.purpose', payment.purposeCode],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-surface-soft font-display flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-medium"
        >
          {initial(payment.name)}
        </span>
        <p className="font-display text-lg font-medium">{payment.name}</p>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
        {rows
          .filter(([, value]) => value.trim().length > 0)
          .map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-sm text-muted">{t(key)}</dt>
              <dd className="text-sm tabular-nums break-words">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

export { PaymentSummary };
```

The recipient name moves out of the `<dl>` (the avatar row carries it); IBAN, amount, reference, remittance, and purpose stay, still filtered to non-empty values.

- [ ] **Step 2: Tests, typecheck, build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all pass.

- [ ] **Step 3: Manual check**

With `pnpm dev`, reach a payment summary (desktop result after converting a test image, or the phone pay screen) and confirm: circular initial, recipient name, and rows including a `tabular-nums` amount.

- [ ] **Step 4: Commit**

```bash
git add src/components/PaymentSummary.tsx
git commit -m "feat(ui): transaction-style payment summary"
```

---

### Task 4: StepPills, Hero, and Sheet components

**Files:**
- Create: `src/components/StepPills.tsx`
- Create: `src/components/Hero.tsx`
- Create: `src/components/Sheet.tsx`

**Interfaces:**
- Consumes: `cn` from `../lib/cn`, `useT`; `.hero-glow` class from Task 1.
- Produces:
  - `StepPills({ activeIndex: number; tone?: 'default' | 'hero' })` — used by Tasks 5 and 6.
  - `Hero({ children: ReactNode; className?: string })` — used by Task 5.
  - `Sheet({ children: ReactNode; className?: string })` — used by Task 5.
- `Stepper.tsx` still exists and is still used by `AppShell` at the end of this task; it is deleted in Task 5.

- [ ] **Step 1: Create `src/components/StepPills.tsx`**

```tsx
import { cn } from '../lib/cn';
import { useT } from '../session/useT';

interface StepPillsProps {
  activeIndex: number;
  /** `hero` renders the on-gradient treatment. */
  tone?: 'default' | 'hero';
}

/** Two pill segments: the phone's Scan → Pay, and desktop's input → result. */
function StepPills({ activeIndex, tone = 'default' }: StepPillsProps) {
  const t = useT();
  const labels = [t('step.scan'), t('step.pay')];
  const hero = tone === 'hero';

  return (
    <ol
      className={cn(
        'flex w-fit items-center gap-1 rounded-full p-1',
        hero ? 'bg-white/15' : 'bg-surface-soft',
      )}
    >
      {labels.map((label, index) => {
        const active = index === activeIndex;
        return (
          <li key={label}>
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-[0.15em] uppercase transition-colors',
                active
                  ? hero
                    ? 'bg-white text-hero-from'
                    : 'bg-ink text-on-ink'
                  : hero
                    ? 'text-white'
                    : 'text-muted',
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export { StepPills };
```

- [ ] **Step 2: Create `src/components/Hero.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface HeroProps {
  children: ReactNode;
  className?: string;
}

/** Violet gradient band; views compose a header row and a headline inside. */
function Hero({ children, className }: HeroProps) {
  return (
    <div
      className={cn(
        'from-hero-from to-hero-to relative overflow-hidden bg-linear-to-br text-white',
        className,
      )}
    >
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col gap-6 px-5 pt-4 pb-16 sm:px-8">{children}</div>
    </div>
  );
}

export { Hero };
```

- [ ] **Step 3: Create `src/components/Sheet.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface SheetProps {
  children: ReactNode;
  className?: string;
}

/** Surface panel that overlaps the hero's bottom edge. */
function Sheet({ children, className }: SheetProps) {
  return (
    <div
      className={cn(
        'rounded-t-sheet bg-surface -mt-10 flex flex-col items-center gap-6 px-5 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { Sheet };
```

- [ ] **Step 4: Tests, typecheck, build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all pass. (The three components are not imported by any view yet; this is expected.)

- [ ] **Step 5: Commit**

```bash
git add src/components/StepPills.tsx src/components/Hero.tsx src/components/Sheet.tsx
git commit -m "feat(ui): hero, sheet, and step pills components"
```

---

### Task 5: Full-bleed shell and the phone hero-over-sheet layout

**Files:**
- Modify: `src/App.tsx` (full replacement)
- Modify: `src/components/AppShell.tsx` (full replacement)
- Modify: `src/views/PhoneView.tsx` (full replacement)
- Modify: `src/views/DesktopView.tsx` (remove the `onStepChange` prop and its effect only)
- Delete: `src/components/Stepper.tsx`

**Interfaces:**
- Consumes: `Hero`, `Sheet`, `StepPills` (Task 4), `LanguageToggle tone="hero"` (Task 2), `PaymentSummary` (Task 3).
- Produces:
  - `AppShell({ children: ReactNode })` — canvas only; no `activeIndex`, no header/footer.
  - `PhoneView()` and `DesktopView()` — no props. Desktop keeps its pre-redesign layout for this task, but stops reporting steps; Task 6 restructures it.

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useEffect, useMemo } from 'react';
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

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <TooltipProvider>
      <AppShell>
        {device === 'desktop' ? <DesktopView /> : <PhoneView />}
      </AppShell>
      <Toaster />
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Replace `src/components/AppShell.tsx`**

```tsx
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

/** The theme canvas. Views are full-bleed and own their own chrome. */
function AppShell({ children }: AppShellProps) {
  return <div className="bg-canvas text-ink min-h-dvh">{children}</div>;
}

export { AppShell };
```

- [ ] **Step 3: Delete `src/components/Stepper.tsx`**

```bash
git rm src/components/Stepper.tsx
```

- [ ] **Step 4: Replace `src/views/PhoneView.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Hero } from '../components/Hero';
import { LanguageToggle } from '../components/LanguageToggle';
import { PaymentSummary } from '../components/PaymentSummary';
import { QrCode } from '../components/QrCode';
import { Sheet } from '../components/Sheet';
import { StepPills } from '../components/StepPills';
import { formatEuros } from '../core/payment';
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

function PhoneView() {
  const state = useAppState();
  const t = useT();
  const step = phoneStep(state);
  const sent = currentPayment(state);
  const [revolutFailed, setRevolutFailed] = useState(false);

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

  return (
    <div className="bg-canvas flex min-h-dvh flex-col">
      <Hero>
        <header className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium tracking-tight">{t('app.title')}</span>
          <LanguageToggle tone="hero" />
        </header>
        <div className="flex flex-col gap-3">
          <StepPills activeIndex={STEP_INDEX[step]} tone="hero" />
          {step === 'pay' && sent ? (
            <>
              <p className="text-xs font-medium tracking-[0.15em] text-white/80 uppercase">
                {t('phone.ready')}
              </p>
              <p className="font-display text-5xl leading-none font-medium tracking-[-0.035em] tabular-nums">
                EUR {formatEuros(sent.payment.amountCents)}
              </p>
              <p className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-sm">
                {sent.payment.name}
              </p>
            </>
          ) : (
            <h1 className="font-display text-3xl leading-tight font-medium tracking-[-0.02em]">
              {t('phone.scanTitle')}
            </h1>
          )}
        </div>
      </Hero>

      <Sheet className="flex-1">
        {step === 'pay' && sent ? (
          <>
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
        ) : state.cameraError ? (
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-ink">{t(CAMERA_ERROR_KEYS[state.cameraError])}</p>
            <p className="text-sm text-muted">{t('phone.cameraDeniedHelp')}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t('phone.cameraRetry')}
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label={t('phone.scanTitle')}
              className="rounded-card w-[min(88vw,26rem)] bg-ink/90 object-cover shadow-sm"
            />
            <p className="max-w-sm text-center text-sm text-muted">
              {t('phone.scanInstruction')}
            </p>
          </>
        )}
      </Sheet>
    </div>
  );
}

export { PhoneView };
```

- [ ] **Step 5: Drop the step plumbing from `src/views/DesktopView.tsx`** (layout stays as-is until Task 6)

Remove the `STEP_INDEX` constant, change the signature to `function DesktopView()`, and delete this effect:

```tsx
  useEffect(() => {
    onStepChange(sent ? STEP_INDEX.result : STEP_INDEX.input);
  }, [sent, onStepChange]);
```

Keep the `useEffect` import (the paste listener still uses it) and every other behaviour untouched.

- [ ] **Step 6: Tests, typecheck, build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all pass. (`Stepper` is gone with no references; `PhoneView` and `DesktopView` take no props.)

- [ ] **Step 7: Manual check**

`pnpm dev`:
- `?device=phone` (with camera permission denied to avoid the viewfinder): gradient hero with wordmark, language pills, Scan pill; sheet slides over the hero with the camera-error state and retry button. Toggle dark mode and repeat.
- `?device=desktop`: conversion/result content still works, now on the plain canvas without the old header/footer (this is expected until Task 6).

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components/AppShell.tsx src/views/PhoneView.tsx src/views/DesktopView.tsx
git commit -m "feat(ui): full-bleed shell and Revolut phone hero/sheet"
```

---

### Task 6: Desktop header, two-column input, centred result

**Files:**
- Modify: `src/views/DesktopView.tsx` (full replacement)

**Interfaces:**
- Consumes: `Hero` is not used here; `StepPills`, `LanguageToggle`, `Badge`, `Button`, `Card`, `QrCode`, `PaymentSummary`, and the existing `handleFile`/`appUrl`/`firstImage` helpers.
- Produces: the desktop screens described in the spec — header (wordmark + `StepPills` + `LanguageToggle`), two-column input (conversion left, phone hand-off right), centred result. No props.

- [ ] **Step 1: Replace `src/views/DesktopView.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { LanguageToggle } from '../components/LanguageToggle';
import { PaymentSummary } from '../components/PaymentSummary';
import { QrCode } from '../components/QrCode';
import { StepPills } from '../components/StepPills';
import { ingestErrorKey, ingestUpn } from '../session/ingest';
import { resolveRevolutLink } from '../session/revolut';
import { decodeImageFile } from '../session/scanner';
import { addPayment, currentPayment, resetPayments, useAppState } from '../session/store';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

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

function Header({ activeIndex }: { activeIndex: number }) {
  const t = useT();
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <span className="text-sm font-medium tracking-tight">{t('app.title')}</span>
      <div className="flex items-center gap-3">
        <StepPills activeIndex={activeIndex} />
        <LanguageToggle />
      </div>
    </header>
  );
}

function DesktopView() {
  const state = useAppState();
  const t = useT();
  const sent = currentPayment(state);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const decodingRef = useRef(false);

  const handleFile = useCallback(async (file: Blob) => {
    if (decodingRef.current) return;
    decodingRef.current = true;
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
      decodingRef.current = false;
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
      <div className="canvas-glow bg-canvas min-h-dvh">
        <Header activeIndex={1} />
        <main className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-5 pb-16 sm:px-8">
          <Badge>{t('phone.ready')}</Badge>
          <QrCode value={sent.epc} size={240} label={t('desktop.epcQrLabel')} />
          <p className="font-display max-w-sm text-center text-2xl leading-tight font-medium text-balance">
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
        </main>
      </div>
    );
  }

  return (
    <div className="canvas-glow bg-canvas min-h-dvh">
      <Header activeIndex={0} />
      <main className="mx-auto grid w-full max-w-5xl gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-2 lg:items-center">
        <section className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
          <h1 className="font-display text-5xl leading-[1.05] font-medium tracking-[-0.03em] text-balance">
            {t('desktop.uploadTitle')}
          </h1>
          <p className="max-w-md text-lg text-muted">{t('desktop.uploadInstruction')}</p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = firstImage(event.dataTransfer.files);
              if (file) void handleFile(file);
            }}
            className="rounded-card border-line bg-surface flex w-[min(88vw,26rem)] flex-col items-center gap-4 border border-dashed p-8"
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
            {error && <p className="text-center text-sm text-danger">{t(error)}</p>}
          </div>
        </section>
        <aside className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted">{t('desktop.orPhoneTitle')}</p>
          <QrCode value={appUrl()} size={150} label={t('desktop.qrLabel')} />
          <p className="max-w-sm text-center text-sm text-muted">{t('desktop.qrHint')}</p>
        </aside>
      </main>
    </div>
  );
}

export { DesktopView };
```

- [ ] **Step 2: Tests, typecheck, build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all pass.

- [ ] **Step 3: Manual check**

`pnpm dev`, then `?device=desktop`:
- Light and dark: header with wordmark, Scan/Pay pills (input active first), language pills; dark shows the blue radial glow, light is a clean catalogue.
- Input: two columns at ≥1024px, stacked below; the drop zone accepts drag/drop; the hand-off QR is present.
- Drop a UPN-QR image (or paste one): result screen shows ready badge, 240px EPC QR, 150px `revolut://` QR, summary card, Convert another → back to input.
- Deliberately drop a non-QR image: the error renders in `text-danger`.

- [ ] **Step 4: Commit**

```bash
git add src/views/DesktopView.tsx
git commit -m "feat(ui): two-column desktop conversion and branded result"
```

---

### Task 7: Full-matrix verification and stale-reference sweep

**Files:**
- No source changes expected. If a check fails, fix it and commit (`fix(ui): …`).

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: verified evidence (test/typecheck/build output + screenshots) for the spec's Verification section.

- [ ] **Step 1: Stale-reference sweep**

Run:

```bash
rg -n "fonts.googleapis|fonts.gstatic|Fraunces|oklch|Stepper|onStepChange|host\.|bg-gradient-to" index.html src
```

Expected: no output.

- [ ] **Step 2: Full test, typecheck, build**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all pass, no suites deleted (10 test files: `device`, `core/{epc,payment,qr-image,upn}`, `i18n/i18n`, `session/{ingest,revolut,save,steps}`).

- [ ] **Step 3: Manual matrix in the preview**

`pnpm dev`, then for each combination below, capture a screenshot for review:
- `?device=desktop`, light and dark: input, result.
- `?device=phone`, light and dark: scan (camera denied), pay (scan a real UPN code on a phone, or use a phone-sized viewport with a camera and a UPN QR on another screen).
- Narrow viewport (<1024px) for desktop input: single column, no overflow.
- Toggle `sl`/`en` in the hero and in the desktop header: labels change, pills stay aligned.

- [ ] **Step 4: Correctness spot-checks**

- QR cards are the same in both themes (white, 20px radius, quiet zone intact); scan the EPC and `revolut://` codes with a phone camera to confirm they still resolve.
- Camera-error state renders the three-message block and Try again reloads.
- Focus ring: Tab through the language pills and buttons — 2px cobalt outline with 2px offset.
- The phone pay screen's Save button still triggers the share sheet/download (tap only), and Open Revolut still opens the deep link.

- [ ] **Step 5: Commit only if fixes were needed**

```bash
git add -A
git commit -m "fix(ui): final redesign verification fixes"
```

If every check passed with no edits, there is nothing to commit and the plan is complete.
