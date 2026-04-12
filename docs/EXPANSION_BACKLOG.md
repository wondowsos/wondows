# Wondows expansion — lane, shipped slice, backlog

## Primary lane

**Cohesion (virtual FS + Terminal + Explorer)** — one set of rules for how files open, wired through both the GUI and the shell. This keeps the faux-OS believable before adding large new surfaces (wallet polish, games, etc.).

## Shipped MVP (this iteration)

- **Shared file associations** — [`src/lib/fileAssociations.js`](../src/lib/fileAssociations.js) defines how a VFS path opens in an app (`.txt` / `.log` / `.md` → Notepad, `.wimg` → Paint, otherwise Browser).
- **File Explorer** and **desktop file shortcuts** use that helper so double-click behavior matches everywhere ([`src/components/apps/ExplorerApp.jsx`](../src/components/apps/ExplorerApp.jsx), [`src/components/Desktop.jsx`](../src/components/Desktop.jsx)).
- **Terminal** — `open <path>` resolves paths from the current directory, opens files with the same associations or folders in File Explorer; `theme <id>` and `wallpaper <id>` match [`src/constants.js`](../src/constants.js) lists ([`src/components/apps/TerminalApp.jsx`](../src/components/apps/TerminalApp.jsx)).

## Backlog (from brainstorm, rough effort)

Effort: **S** small (hours), **M** medium (1–2 days), **L** larger (multi-day / architectural).

### Deepen the “real OS” feel

| Idea | Effort |
|------|--------|
| Snap windows to screen edges | M |
| Maximize/restore animations | S |
| “Shake title bar” to minimize other windows | M |
| Per-window always-on-top | S |
| Window grouping / taskbar stacks | L |
| Trash with restore (vs only delete from Trash) | M |
| “Send to desktop” shortcut files | M |
| Desktop icon grid align + auto-arrange | S |
| Virtual desktops / workspace switcher | L |
| Notification toasts | M |
| Quick settings flyout | M |
| Calendar popout from Clock on taskbar | S |
| Fake battery / network taskbar widgets | S |
| Alt+Tab window switcher overlay | M |
| Stronger keyboard focus model (which window receives typing) | M |

### Virtual filesystem and apps

| Idea | Effort |
|------|--------|
| Explorer search / filter | M |
| Image thumbnails in Explorer | M |
| Recent files list | S |
| Zip/unzip in-browser | L |
| Fake disk quota / free space meter | S |
| New mini-app: image viewer | M |
| New mini-app: media player + visualizer | L |
| New mini-app: sticky notes | S |
| New mini-app: task manager (list/kill windows) | M |
| New mini-app: Solitaire / simple card game | L |
| New mini-app: RSS reader | M |
| New mini-app: Markdown preview | S |
| New mini-app: JSON/XML formatter | S |
| New mini-app: color picker | S |
| New mini-app: stopwatch / timer | S |
| Snipping tool (capture OS canvas only) | L |

### Terminal and power-user hooks

| Idea | Effort |
|------|--------|
| `alias` stored in localStorage | S |
| Pipe terminal output into new Notepad window | M |
| More commands: `pwd`, `ren`, `copy`, `move` (VFS) | M |

### Settings, persistence, polish

| Idea | Effort |
|------|--------|
| Local user profiles (separate FS or presets) | L |
| Import/export VFS + settings JSON blob | M |
| Virtualize very large folder lists | M |
| Lazy-load heavy app bundles (expand beyond PumpFun) | S |
| Split [`src/os.css`](../src/os.css) into feature modules | M |

### Solana / wallet (optional lane)

| Idea | Effort |
|------|--------|
| Clear network indicator (devnet/mainnet) | S |
| Transaction history panel | M |
| Lock screen / auto-lock / seed paste warnings | M |
| Read-only portfolio desktop widget | M |
| Settings toggle for network with high-visibility UI | S |

### Distribution and quality

| Idea | Effort |
|------|--------|
| PWA manifest + offline shell | M |
| Unit tests for `wondowsFs` and window state | M |
| Playwright e2e (drag, open file, terminal) | L |
| TypeScript migration | L |

### Suggested next vertical slices (pick one)

1. **Delight** — notifications + Alt+Tab + edge snap (cohesive “feels like an OS”).
2. **Explorer** — search + thumbnails.
3. **Wallet UX** — network indicator + settings surfacing (if crypto stays a focus).
