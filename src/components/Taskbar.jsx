import { useEffect, useMemo, useState } from 'react'
import {
  Bomb,
  FileText,
  FolderOpen,
  Globe,
  LayoutGrid,
  Palette,
  Pill,
  Settings,
  Terminal,
  Volume2,
  Wallet,
} from 'lucide-react'
import { STORAGE_KEYS } from '../constants'
import { useOs } from '../context/OsContext'
import { playUiBeep } from '../lib/beep'
import StartMenu from './StartMenu'

function readStoredVolume() {
  if (typeof localStorage === 'undefined') return 70
  try {
    const n = Number.parseInt(localStorage.getItem(STORAGE_KEYS.volume), 10)
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, n))
  } catch {
    /* ignore */
  }
  return 70
}

const PINNED = [
  { type: 'explorer', icon: FolderOpen, label: 'Files' },
  { type: 'browse', icon: Globe, label: 'Browse' },
  { type: 'notepad', icon: FileText, label: 'Notepad' },
  { type: 'paint', icon: Palette, label: 'Paint' },
  { type: 'mines', icon: Bomb, label: 'Mines' },
  { type: 'wallet', icon: Wallet, label: 'Wallet' },
  { type: 'pumpfun', icon: Pill, label: 'Token Studio' },
  { type: 'terminal', icon: Terminal, label: 'Terminal' },
  { type: 'settings', icon: Settings, label: 'Settings' },
]

function CalendarPop({ date, onClose }) {
  const y = date.getFullYear()
  const m = date.getMonth()
  const first = new Date(y, m, 1)
  const startDow = first.getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDow; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)

  return (
    <>
      <button
        type="button"
        className="os-cal-overlay"
        aria-label="Close calendar"
        onClick={onClose}
      />
      <div className="os-cal-pop" role="dialog" aria-label="Calendar">
        <div className="os-cal-title">
          {date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <div className="os-cal-dow">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="os-cal-grid">
          {cells.map((d, i) => (
            <span
              key={i}
              className={`os-cal-cell${d === date.getDate() ? ' today' : ''}${d ? '' : ' pad'}`}
            >
              {d ?? ''}
            </span>
          ))}
        </div>
        <p className="os-cal-foot">Current month</p>
      </div>
    </>
  )
}

export default function Taskbar() {
  const {
    windows,
    focusedId,
    startOpen,
    toggleStart,
    openWindow,
    focusWindow,
    setStartOpen,
  } = useOs()

  const [now, setNow] = useState(() => new Date())
  const [calOpen, setCalOpen] = useState(false)
  const [volOpen, setVolOpen] = useState(false)
  const [vol, setVol] = useState(readStoredVolume)
  const [tbMenu, setTbMenu] = useState(null)

  const commitVolume = (n) => {
    const v = Math.max(0, Math.min(100, n))
    setVol(v)
    try {
      localStorage.setItem(STORAGE_KEYS.volume, String(v))
    } catch {
      /* ignore */
    }
    playUiBeep(v)
  }

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!tbMenu) return
    const close = () => setTbMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [tbMenu])

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const dateStr = now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  const typesOpen = new Set(
    windows.filter((w) => !w.minimized).map((w) => w.type),
  )
  const topByType = {}
  windows
    .filter((w) => !w.minimized)
    .forEach((w) => {
      if (!topByType[w.type] || w.zIndex > topByType[w.type].zIndex) {
        topByType[w.type] = w
      }
    })

  const openPinned = useMemo(
    () => ({
      explorer: () => openWindow('explorer', { path: '/Documents' }),
      browse: () => openWindow('browse'),
      notepad: () => openWindow('notepad'),
      paint: () => openWindow('paint'),
      mines: () => openWindow('mines'),
      wallet: () => openWindow('wallet'),
      pumpfun: () => openWindow('pumpfun'),
      terminal: () => openWindow('terminal'),
      settings: () => openWindow('settings'),
    }),
    [openWindow],
  )

  return (
    <>
      {startOpen && (
        <>
          <button
            type="button"
            className="os-start-overlay"
            aria-label="Close Start menu"
            onClick={() => setStartOpen(false)}
          />
          <StartMenu />
        </>
      )}
      {calOpen ? (
        <CalendarPop date={now} onClose={() => setCalOpen(false)} />
      ) : null}
      <footer
        className="os-taskbar"
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setStartOpen(false)
          setVolOpen(false)
          setCalOpen(false)
          setTbMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        <div className="os-taskbar-inner">
          <button
            type="button"
            className={`os-start-btn${startOpen ? ' active' : ''}`}
            onClick={toggleStart}
            aria-expanded={startOpen}
            aria-label="Start"
          >
            <LayoutGrid size={22} strokeWidth={2} />
          </button>
          <div className="os-pinned">
            {PINNED.map((pin) => {
              const { type, icon: IconComponent } = pin
              const running = typesOpen.has(type)
              const top = topByType[type]
              const active = top && focusedId === top.id
              return (
                <button
                  key={type}
                  type="button"
                  className={`os-task-btn${running ? ' running' : ''}${active ? ' active-window' : ''}`}
                  title={type}
                  onClick={() => {
                    if (top) focusWindow(top.id)
                    else openPinned[type]?.()
                  }}
                >
                  <IconComponent size={20} strokeWidth={1.75} />
                </button>
              )
            })}
          </div>
          <div className="os-tray">
            <div className="os-tray-vol-wrap">
              <button
                type="button"
                className="os-tray-ic"
                aria-expanded={volOpen}
                aria-label="Volume"
                onClick={() => {
                  setVolOpen((v) => !v)
                  setCalOpen(false)
                }}
              >
                <Volume2 size={18} strokeWidth={2} />
              </button>
              {volOpen ? (
                <div className="os-vol-pop" role="dialog" aria-label="Volume">
                  <label className="os-vol-label">
                    Volume
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={vol}
                      onChange={(e) => setVol(Number(e.target.value))}
                      onMouseUp={(e) => commitVolume(Number(e.currentTarget.value))}
                      onTouchEnd={(e) => commitVolume(Number(e.currentTarget.value))}
                    />
                  </label>
                  <span className="os-vol-num">{vol}%</span>
                  <p className="os-vol-note">
                    Preview sound uses this level when sound effects are enabled in
                    Settings.
                  </p>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="os-clock"
              onClick={() => {
                setCalOpen((c) => !c)
                setVolOpen(false)
              }}
            >
              <div className="os-clock-time">{timeStr}</div>
              <div className="os-clock-date">{dateStr}</div>
            </button>
          </div>
        </div>
      </footer>
      {tbMenu ? (
        <ul
          className="os-ctx-menu"
          style={{
            position: 'fixed',
            left: Math.min(
              tbMenu.x,
              typeof window !== 'undefined' ? window.innerWidth - 240 : tbMenu.x,
            ),
            top: Math.min(
              tbMenu.y,
              typeof window !== 'undefined' ? window.innerHeight - 200 : tbMenu.y,
            ),
            zIndex: 20050,
          }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                openWindow('settings')
                setTbMenu(null)
              }}
            >
              Taskbar settings
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                openWindow('terminal')
                setTbMenu(null)
              }}
            >
              Open Terminal
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                openWindow('about')
                setTbMenu(null)
              }}
            >
              About
            </button>
          </li>
        </ul>
      ) : null}
    </>
  )
}
