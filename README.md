# Wondows

Wondows is a **Solana-first** desktop you run in the browser: an OS-shaped shell that tries to put what on-chain degens actually use—wallet, token tooling, file-style workflows, and small utilities—in one place instead of a mess of tabs and bookmarklets.

We are building this on purpose in public: it is **still in progress**, not a finished product, so expect missing pieces, rough edges, and changes as we keep shipping.

Under the hood it is still a **single-page app**. You get a taskbar, start menu, draggable windows, and built-in programs. Virtual files, the Recycle Bin, Notepad, wallpapers, and most settings live in **localStorage** on that device, so clearing site data for the site wipes them.

The stack is **React** and **Vite**. Visually it leans bright and a little ridiculous: Comic Neue, chunky borders, a Windows-adjacent vibe without pretending to be the real thing. Chain features need a working **Solana** RPC and any optional backends you configure; you can still click around the desktop without them.

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

[MIT](LICENSE).
