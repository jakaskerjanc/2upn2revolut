# 2upn2revolut

Revolut can scan EPC (SEPA) QR codes but not Slovenian UPN QR codes. This bridges the gap:
your phone scans the UPN QR on a paper bill, converts it to EPC, and relays it to your
desktop screen, which shows the EPC QR big enough for Revolut on that same phone to scan.

**https://jakaskerjanc.github.io/2upn2revolut/**

## How it works

1. Open the site on a computer. It shows a pairing QR.
2. Scan that with your phone's normal camera app — no install, no typing.
3. The phone opens already paired, with the camera live. Point it at the UPN QR on your bill.
4. The desktop swaps the pairing QR for the EPC QR. Open Revolut, tap Scan, point it at
   the screen.

Two scans, zero typing. Both devices show the same three-step guide (Pair → Scan → Pay),
each displaying only its own next action.

## Why a second device

Revolut scans a QR with the same phone camera that would have to be pointed at the bill.
A phone cannot show a QR to itself, so the desktop screen acts as the display surface.

## Design

There is no server. Pairing and messaging run over WebRTC via the public PeerJS broker,
so the whole app deploys as a static site on GitHub Pages. The pairing URL carries the
peer id, which is why there is nothing to type.

Amounts are integer cents throughout. `RF` (ISO 11649) references go in the EPC structured
reference field; Slovenian `SI`-model references go in the unstructured field, ahead of the
payment purpose, so a long purpose text can never truncate the reference the creditor
reconciles on.

Full design notes: [`docs/superpowers/specs/2026-08-24-2upn2revolut-design.md`](docs/superpowers/specs/2026-08-24-2upn2revolut-design.md).

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5173/2upn2revolut/
pnpm test       # vitest over core/, transport/, session/, router
pnpm typecheck
pnpm build
```

The camera needs a secure context. `localhost` counts as one, so desktop development works
without certificates; to test the phone side against a dev server on your LAN you need
HTTPS, or just deploy and test against the live site.

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_REVOLUT_DEEPLINK` | `revolut://` | Deep link the "Open Revolut" button follows |

Revolut publishes no consumer deep-link scheme, so the button is best-effort: it detects
whether the app actually launched and falls back to written instructions, which stand on
their own either way. `?revolut=` on the phone URL overrides it per session.

## Limitations

- The public PeerJS broker is a third-party dependency with a documented history of rate
  limiting. If it is down, pairing fails; the app reports it and retries with backoff.
- No TURN server. Phone and desktop on the same Wi-Fi connect directly, which is the
  expected setting.
- Payment history is the last five EPC codes, in memory only.

## License

MIT
