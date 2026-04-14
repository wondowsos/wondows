import { useMemo, useState } from 'react'
import {
  Bomb,
  Bot,
  Calculator,
  Clock,
  FileText,
  FolderOpen,
  Globe,
  Info,
  Monitor,
  Palette,
  Pill,
  Settings,
  Sparkles,
  Terminal,
  User,
  Wallet,
  Waves,
} from 'lucide-react'
import { useOs } from '../context/OsContext'

const LAUNCH = [
  {
    type: 'browse',
    label: 'Browser',
    search: 'web internet browser edge www',
    icon: Globe,
    bg: '#00c853',
  },
  {
    type: 'notepad',
    label: 'Notepad',
    search: 'notes text txt editor',
    icon: FileText,
    bg: '#2962ff',
  },
  {
    type: 'terminal',
    label: 'Terminal',
    search: 'cmd command dos hack',
    icon: Terminal,
    bg: '#aa00ff',
  },
  {
    type: 'settings',
    label: 'Settings',
    search: 'config options wallpaper knobs',
    icon: Settings,
    bg: '#ff6d00',
  },
  {
    type: 'explorer',
    label: 'Documents',
    search: 'folder files explorer pc directories documents',
    icon: FolderOpen,
    bg: '#ff9100',
    payload: { path: '/Documents' },
  },
  {
    type: 'paint',
    label: 'Paint',
    search: 'paint draw ms wimg pictures art',
    icon: Palette,
    bg: '#ec407a',
  },
  {
    type: 'mines',
    label: 'Minesweeper',
    search: 'minesweeper bomb grid game flag',
    icon: Bomb,
    bg: '#5d4037',
  },
  {
    type: 'clock',
    label: 'Clock',
    search: 'clock time stopwatch date',
    icon: Clock,
    bg: '#5c6bc0',
  },
  {
    type: 'calculator',
    label: 'Calculator',
    search: 'calc numbers math',
    icon: Calculator,
    bg: '#7c4dff',
  },
  {
    type: 'wallet',
    label: 'Wallet',
    search: 'solana api wallet crypto pump',
    icon: Wallet,
    bg: '#00bcd4',
  },
  {
    type: 'pumpfun',
    label: 'Token Studio',
    search: 'token create mint pumpfun coin ipfs pinata',
    icon: Pill,
    bg: '#e040fb',
  },
  {
    type: 'meteora',
    label: 'Meteora',
    search: 'meteora dlmm liquidity solana dex pool',
    icon: Waves,
    bg: '#26a69a',
  },
  {
    type: 'atm',
    label: 'ATM',
    search: 'atm bot trading automated solana sniper',
    icon: Bot,
    bg: '#ffb300',
  },
  {
    type: 'newpairs',
    label: 'New pairs',
    search: 'new pair token pump websocket stream launch mint realtime',
    icon: Sparkles,
    bg: '#7c4dff',
  },
  {
    type: 'about',
    label: 'About',
    search: 'info help version',
    icon: Info,
    bg: '#d50000',
  },
  {
    type: 'explorer',
    label: 'This PC',
    search: 'computer system drive c pc root',
    icon: Monitor,
    bg: '#00b8d4',
    payload: { path: '/' },
  },
]

const RUN_WORDS = {
  notepad: 'notepad',
  notes: 'notepad',
  np: 'notepad',
  browse: 'browse',
  web: 'browse',
  internet: 'browse',
  terminal: 'terminal',
  cmd: 'terminal',
  settings: 'settings',
  knobs: 'settings',
  explorer: 'explorer',
  files: 'explorer',
  folder: 'explorer',
  calc: 'calculator',
  calculator: 'calculator',
  math: 'calculator',
  about: 'about',
  pc: 'explorer',
  wallet: 'wallet',
  w: 'wallet',
  sol: 'wallet',
  pump: 'wallet',
  pumpfun: 'pumpfun',
  mint: 'pumpfun',
  token: 'pumpfun',
  pill: 'pumpfun',
  meteora: 'meteora',
  dlmm: 'meteora',
  atm: 'atm',
  bot: 'atm',
  trading: 'atm',
  newpairs: 'newpairs',
  pairs: 'newpairs',
  stream: 'newpairs',
  paint: 'paint',
  draw: 'paint',
  scribble: 'paint',
  mines: 'mines',
  mine: 'mines',
  sweeper: 'mines',
  clock: 'clock',
  time: 'clock',
  stopwatch: 'clock',
}

function matchesQuery(item, tokens) {
  if (tokens.length === 0) return true
  const hay = `${item.label} ${item.search ?? ''}`.toLowerCase()
  return tokens.every((t) => hay.includes(t))
}

export default function StartMenu() {
  const { openWindow } = useOs()
  const [q, setQ] = useState('')

  const tokens = useMemo(
    () =>
      q
        .toLowerCase()
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [q],
  )

  const visible = useMemo(
    () => LAUNCH.filter((it) => matchesQuery(it, tokens)),
    [tokens],
  )

  const launch = (item) => {
    openWindow(item.type, item.payload ?? null)
  }

  const onSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return
    const word = q.trim().toLowerCase()
    const mapped = RUN_WORDS[word]
    if (mapped) {
      if (mapped === 'explorer') openWindow('explorer', { path: '/' })
      else openWindow(mapped)
      setQ('')
      return
    }
    if (visible.length > 0) {
      launch(visible[0])
      setQ('')
    }
  }

  return (
    <div
      className="os-start-menu"
      role="dialog"
      aria-label="Start"
      data-os-no-global-shortcuts
    >
      <input
        type="search"
        className="os-start-search os-start-search-input"
        placeholder="type words… find a program maybe"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onSearchKeyDown}
        aria-label="Search programs"
      />
      <div className="os-start-pinned-label">Programs (tap one, it opens)</div>
      <div className="os-start-grid">
        {visible.length === 0 ? (
          <div className="os-start-empty">No programs match your search.</div>
        ) : (
          visible.map((t, i) => (
            <button
              key={`${t.type}-${t.label}-${i}`}
              type="button"
              className="os-start-tile"
              onClick={() => launch(t)}
            >
              <span
                className="os-start-tile-icon"
                style={{ background: t.bg }}
              >
                <t.icon size={20} strokeWidth={1.75} color="#fff" />
              </span>
              <span>{t.label}</span>
            </button>
          ))
        )}
      </div>
      <div className="os-start-hint">
        <span className="os-start-hint-line">
          Enter = first result · type a command like <kbd>wallet</kbd> or{' '}
          <kbd>notepad</kbd>
        </span>
        <span className="os-start-hint-line os-start-hint-kbd">
          Alt+Shift: E F N B T C S W P M D L A K — files, root, notes, web, term,
          calc, settings, wallet, pump lab, mines, paint, clock, ATM, new pairs
        </span>
      </div>
      <div className="os-start-footer">
        <div className="os-user-pill os-user-pill--static" role="status">
          <User size={20} strokeWidth={1.75} />
          This device
        </div>
      </div>
    </div>
  )
}
