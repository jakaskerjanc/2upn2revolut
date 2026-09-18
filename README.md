# 2upn2revolut

Revolut can scan EPC (SEPA) QR codes but not Slovenian UPN QR codes. This phone tool bridges
the gap: scan the UPN QR on a paper bill, it converts it to EPC, and you save the EPC QR as
an image to import into Revolut.

**https://jakaskerjanc.github.io/2upn2revolut/**

## How it works

1. Open the site on your phone. Point the camera at the UPN QR on your bill.
2. The app builds the EPC QR and offers a Save/Share button — the QR itself is always
   visible too, so you can long-press it and save it to your photos directly.
3. Open Revolut and import the saved image from your gallery.

One scan, zero typing.

## On a computer

On a computer you can convert without a phone camera: upload, paste, or drag in an image of
the bill's UPN QR code. The app decodes it, builds the EPC QR, and shows it on screen — scan
that with Revolut on your phone. If Revolut isn't open yet, a "Revolut not open yet?" toggle
reveals a smaller `revolut://` QR to scan with your phone to launch Revolut straight on its
scanner. The old "continue on your phone" hand-off QR
stays available as a second option. (Images only — PDFs are not supported.)

## Design

There is no server and no networking. QR generation and PNG encoding are fully client-side
via the `qrcode` library, so the whole app deploys as a static site on GitHub Pages.

Amounts are integer cents throughout. `RF` (ISO 11649) references go in the EPC structured
reference field; Slovenian `SI`-model references go in the unstructured field, ahead of the
payment purpose, so a long purpose text can never truncate the reference the creditor
reconciles on.

Full design notes: [`docs/superpowers/specs/2026-09-07-phone-only-rework-design.md`](docs/superpowers/specs/2026-09-07-phone-only-rework-design.md).

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5173/2upn2revolut/
pnpm test       # vitest
pnpm typecheck
pnpm build
```

The camera needs a secure context. `localhost` counts as one, so desktop development works
without certificates. To test the phone side against a dev server on your LAN, generate a
self-signed cert once with `pnpm certs` — `vite.config.ts` picks it up automatically and
serves dev over HTTPS (the phone browser will show an untrusted-cert warning to click
through). Re-run `pnpm certs --force` if your LAN IP changes.

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_REVOLUT_DEEPLINK` | `revolut://app/payments-qr-scan` | Deep link the "Open Revolut" button follows |

The deep link opens Revolut straight on its QR scanner. It is undocumented, so the button
is still best-effort: it detects whether the app actually launched and, if not, falls back
to a link to revolut.com plus the written "open it manually and tap Scan" instruction.
`?revolut=` on the phone URL overrides it per session.

## License

MIT
