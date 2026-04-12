# Wondows

Wondows is a single-page app that imitates a classic desktop: taskbar, start menu, draggable windows, and a handful of built-in programs. Everything runs in the browser. Your virtual files, Recycle Bin, Notepad content, wallpapers, and most settings live in **localStorage** on that machine, so clearing site data will wipe them.

The UI is built with **React** and **Vite**. Styling goes for a bright, slightly silly Windows-adjacent look (Comic Neue, chunky borders). Some features touch **Solana** (wallet + token tooling); those parts only work if you point the app at working RPC and optional backend URLs.

## Requirements

- Node.js 18 or newer (whatever runs current Vite 8 is fine)
- npm (or use your own package manager and translate the commands)

## Run locally

```bash
npm install
npm run dev
```

Vite listens on all interfaces (`host: true`), so you can open the dev server from another device on your LAN using your machine’s IP and the port Vite prints (usually 5173).

Production build:

```bash
npm run build
npm run preview
```

`preview` uses the same dev proxy rules as `npm run dev`, which matters if you rely on `/api/...` routes (see below).

Lint:

```bash
npm run lint
```

## Environment variables

Copy `.env.example` to `.env` and set whatever you need. `.env` is gitignored and should stay that way.

| Variable | Where it’s read | Purpose |
|----------|------------------|---------|
| `VITE_SOLANA_RPC_URL` | Client | HTTP JSON-RPC for Solana (e.g. Helius, QuickNode). If unset, the app falls back to the public mainnet endpoint, which is rate-limited and not ideal for real use. |
| `PINATA_JWT` | Vite dev/preview proxy only | Bearer token for Pinata. The dev server forwards `/api/pinata/*` to Pinata and injects this header so the token never ships to the browser. |
| `VITE_WALLET_API_ORIGIN` | Vite dev/preview proxy only | Base URL of a backend that implements your wallet HTTP API. When set, `/api/wallet/*` and `/api/trade-local` are proxied there. |
| `VITE_WALLET_CREATE_URL` | Client (optional) | Overrides the default `/api/wallet/create-wallet` path for wallet creation. |
| `VITE_TRADE_LOCAL_URL` | Client (optional) | Overrides the default `/api/trade-local` base used by Token Studio trade flows. |
| `VITE_PINATA_UPLOAD_BASE` | Client (optional) | Overrides the default `/api/pinata` base for uploads. |

None of the Solana or Pinata integration is mandatory to click around the desktop; it only matters when you use Wallet or Token Studio.

## What’s in the box

Rough inventory: File Explorer (paths under a fake drive), Notepad, a simple browser pane, terminal, calculator, clock, Minesweeper, Paint, Settings (wallpaper and themes), About, Wallet, and Token Studio (metadata upload and mint-related flows that expect a configured RPC and optional services).

Keyboard shortcuts are listed in the About window; they mostly open apps with Alt+Shift plus a letter.

## Security and data

Wallet private material and API keys the app stores are kept in **localStorage** in this browser profile. That is convenient for a toy setup and risky for large amounts of funds. Use Export in Wallet if you want a JSON backup, and do not commit real keys or Pinata JWTs to git.

## License

No license file is included in this repository. If you fork or ship it, add one that matches how you want others to use the code.
