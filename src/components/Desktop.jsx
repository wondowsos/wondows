import { cloneElement, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bomb,
  Calculator,
  Clock,
  FileText,
  FolderOpen,
  Globe,
  Monitor,
  Palette,
  Pill,
  Settings,
  Terminal,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useOs } from '../context/OsContext'
import { useFs } from '../context/FsContext'
import { baseName } from '../fs/wondowsFs'
import {
  DEFAULT_DESKTOP_LABELS,
  fileDesktopIconId,
  getFileDesktopLabel,
  loadDesktopLabelOverrides,
  mergeDesktopLabels,
  parseFileDesktopIconId,
  saveDesktopLabelOverrides,
} from '../lib/desktopLabels'
import { getFileOpenWindowSpec } from '../lib/fileAssociations'

/** Match Start menu tile accent colors */
const TILE = {
  trash: '#757575',
  pc: '#00b8d4',
  files: '#ff9100',
  notepad: '#2962ff',
  browse: '#00c853',
  calc: '#7c4dff',
  wallet: '#00bcd4',
  pumpfun: '#e040fb',
  settings: '#ff6d00',
  terminal: '#aa00ff',
  paint: '#ec407a',
  mines: '#5d4037',
  clock: '#5c6bc0',
}

function isTypingTarget(el) {
  if (!el || !(el instanceof Element)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  if (el.closest('[data-os-no-global-shortcuts]')) return true
  return false
}

function DesktopIcon({
  iconId,
  label,
  tileBg,
  children,
  selected,
  onSelect,
  onOpen,
  onContextMenu,
  badge,
}) {
  const icon = cloneElement(children, {
    size: 24,
    strokeWidth: 1.75,
    color: '#fff',
  })

  return (
    <button
      type="button"
      className={`os-icon-btn${selected ? ' selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(iconId)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu(e, iconId)
      }}
    >
      <span className="os-icon-img-wrap">
        <span className="os-icon-tile-icon" style={{ background: tileBg }}>
          {icon}
        </span>
        {badge > 0 ? (
          <span className="os-icon-badge">{badge > 9 ? '9+' : badge}</span>
        ) : null}
      </span>
      <span className="os-icon-label">{label}</span>
    </button>
  )
}

export default function Desktop() {
  const { openWindow } = useOs()
  const { trashCount, listDir } = useFs()
  const [overrides, setOverrides] = useState(loadDesktopLabelOverrides)
  const [selectedId, setSelectedId] = useState(null)
  const [ctxMenu, setCtxMenu] = useState(null)
  const [bgMenu, setBgMenu] = useState(null)

  const labels = mergeDesktopLabels(overrides)

  const renameIcon = useCallback((iconId) => {
    const filePath = parseFileDesktopIconId(iconId)
    const builtinDef = DEFAULT_DESKTOP_LABELS[iconId]
    if (!filePath && !builtinDef) return

    const defaultLabel = filePath ? baseName(filePath) : builtinDef
    const current = overrides[iconId] ?? defaultLabel
    const raw = window.prompt('Rename desktop icon', current)
    if (raw === null) {
      setCtxMenu(null)
      setBgMenu(null)
      return
    }
    const t = raw.trim().slice(0, 48)
    setOverrides((prev) => {
      const next = { ...prev }
      if (filePath) {
        if (t === '' || t === baseName(filePath)) delete next[iconId]
        else next[iconId] = t
      } else if (t === '' || t === builtinDef) {
        delete next[iconId]
      } else {
        next[iconId] = t
      }
      saveDesktopLabelOverrides(next)
      return next
    })
    setCtxMenu(null)
    setBgMenu(null)
  }, [overrides])

  const deskFilePaths = useMemo(() => {
    const isText = (name) => /\.(txt|log|md)$/i.test(name)
    const paths = listDir('/Desktop')
      .filter((it) => it.type === 'file' && isText(it.name))
      .map((it) => it.path)
    paths.sort((a, b) =>
      getFileDesktopLabel(a, overrides).localeCompare(
        getFileDesktopLabel(b, overrides),
        undefined,
        { sensitivity: 'base' },
      ),
    )
    return paths
  }, [listDir, overrides])

  const openers = useMemo(
    () => ({
      trash: () => openWindow('explorer', { path: '/Trash' }),
      pc: () => openWindow('explorer', { path: '/' }),
      files: () => openWindow('explorer', { path: '/Documents' }),
      notepad: () => openWindow('notepad'),
      browse: () => openWindow('browse'),
      paint: () => openWindow('paint'),
      mines: () => openWindow('mines'),
      clock: () => openWindow('clock'),
      calc: () => openWindow('calculator'),
      wallet: () => openWindow('wallet'),
      pumpfun: () => openWindow('pumpfun'),
      settings: () => openWindow('settings'),
      terminal: () => openWindow('terminal'),
    }),
    [openWindow],
  )

  const openShortcut = useCallback(
    (iconId) => {
      const p = parseFileDesktopIconId(iconId)
      if (p) {
        const spec = getFileOpenWindowSpec(p, baseName(p))
        openWindow(spec.type, spec.payload ?? null)
        return
      }
      openers[iconId]?.()
    },
    [openWindow, openers],
  )

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'F2') return
      if (isTypingTarget(e.target)) return
      if (!selectedId) return
      e.preventDefault()
      renameIcon(selectedId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, renameIcon])

  useEffect(() => {
    if (!ctxMenu && !bgMenu) return
    const close = () => {
      setCtxMenu(null)
      setBgMenu(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [ctxMenu, bgMenu])

  const onCtx = (e, iconId) => {
    setBgMenu(null)
    setSelectedId(iconId)
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      iconId,
    })
  }

  return (
    <div
      className="os-desktop"
      onClick={() => {
        setSelectedId(null)
        setCtxMenu(null)
        setBgMenu(null)
      }}
      onContextMenu={(e) => {
        if (e.target.closest('.os-icon-btn')) return
        e.preventDefault()
        e.stopPropagation()
        setSelectedId(null)
        setCtxMenu(null)
        setBgMenu({ x: e.clientX, y: e.clientY })
      }}
      role="presentation"
    >
      <div
        className="os-desktop-icons"
        onClick={(e) => e.stopPropagation()}
        role="toolbar"
        aria-label="Desktop shortcuts"
      >
        <DesktopIcon
          iconId="trash"
          label={labels.trash}
          tileBg={TILE.trash}
          badge={trashCount}
          selected={selectedId === 'trash'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('trash')}
          onContextMenu={onCtx}
        >
          <Trash2 />
        </DesktopIcon>
        <DesktopIcon
          iconId="pc"
          label={labels.pc}
          tileBg={TILE.pc}
          selected={selectedId === 'pc'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('pc')}
          onContextMenu={onCtx}
        >
          <Monitor />
        </DesktopIcon>
        <DesktopIcon
          iconId="files"
          label={labels.files}
          tileBg={TILE.files}
          selected={selectedId === 'files'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('files')}
          onContextMenu={onCtx}
        >
          <FolderOpen />
        </DesktopIcon>
        <DesktopIcon
          iconId="notepad"
          label={labels.notepad}
          tileBg={TILE.notepad}
          selected={selectedId === 'notepad'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('notepad')}
          onContextMenu={onCtx}
        >
          <FileText />
        </DesktopIcon>
        <DesktopIcon
          iconId="browse"
          label={labels.browse}
          tileBg={TILE.browse}
          selected={selectedId === 'browse'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('browse')}
          onContextMenu={onCtx}
        >
          <Globe />
        </DesktopIcon>
        <DesktopIcon
          iconId="paint"
          label={labels.paint}
          tileBg={TILE.paint}
          selected={selectedId === 'paint'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('paint')}
          onContextMenu={onCtx}
        >
          <Palette />
        </DesktopIcon>
        <DesktopIcon
          iconId="mines"
          label={labels.mines}
          tileBg={TILE.mines}
          selected={selectedId === 'mines'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('mines')}
          onContextMenu={onCtx}
        >
          <Bomb />
        </DesktopIcon>
        <DesktopIcon
          iconId="clock"
          label={labels.clock}
          tileBg={TILE.clock}
          selected={selectedId === 'clock'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('clock')}
          onContextMenu={onCtx}
        >
          <Clock />
        </DesktopIcon>
        <DesktopIcon
          iconId="calc"
          label={labels.calc}
          tileBg={TILE.calc}
          selected={selectedId === 'calc'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('calc')}
          onContextMenu={onCtx}
        >
          <Calculator />
        </DesktopIcon>
        <DesktopIcon
          iconId="wallet"
          label={labels.wallet}
          tileBg={TILE.wallet}
          selected={selectedId === 'wallet'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('wallet')}
          onContextMenu={onCtx}
        >
          <Wallet />
        </DesktopIcon>
        <DesktopIcon
          iconId="pumpfun"
          label={labels.pumpfun}
          tileBg={TILE.pumpfun}
          selected={selectedId === 'pumpfun'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('pumpfun')}
          onContextMenu={onCtx}
        >
          <Pill />
        </DesktopIcon>
        <DesktopIcon
          iconId="settings"
          label={labels.settings}
          tileBg={TILE.settings}
          selected={selectedId === 'settings'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('settings')}
          onContextMenu={onCtx}
        >
          <Settings />
        </DesktopIcon>
        <DesktopIcon
          iconId="terminal"
          label={labels.terminal}
          tileBg={TILE.terminal}
          selected={selectedId === 'terminal'}
          onSelect={setSelectedId}
          onOpen={() => openShortcut('terminal')}
          onContextMenu={onCtx}
        >
          <Terminal />
        </DesktopIcon>
        {deskFilePaths.map((path) => {
          const iconId = fileDesktopIconId(path)
          return (
            <DesktopIcon
              key={path}
              iconId={iconId}
              label={getFileDesktopLabel(path, overrides)}
              tileBg={TILE.notepad}
              selected={selectedId === iconId}
              onSelect={setSelectedId}
              onOpen={() => openShortcut(iconId)}
              onContextMenu={onCtx}
            >
              <FileText />
            </DesktopIcon>
          )
        })}
      </div>

      {ctxMenu ? (
        <ul
          className="os-ctx-menu"
          style={{
            position: 'fixed',
            left: Math.min(
              ctxMenu.x,
              typeof window !== 'undefined' ? window.innerWidth - 200 : ctxMenu.x,
            ),
            top: Math.min(
              ctxMenu.y,
              typeof window !== 'undefined' ? window.innerHeight - 120 : ctxMenu.y,
            ),
            zIndex: 20000,
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
                openShortcut(ctxMenu.iconId)
                setCtxMenu(null)
              }}
            >
              Open
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => renameIcon(ctxMenu.iconId)}
            >
              Rename…
            </button>
          </li>
        </ul>
      ) : null}
      {bgMenu ? (
        <ul
          className="os-ctx-menu"
          style={{
            position: 'fixed',
            left: Math.min(
              bgMenu.x,
              typeof window !== 'undefined' ? window.innerWidth - 260 : bgMenu.x,
            ),
            top: Math.min(
              bgMenu.y,
              typeof window !== 'undefined' ? window.innerHeight - 220 : bgMenu.y,
            ),
            zIndex: 20000,
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
                openWindow('notepad')
                setBgMenu(null)
              }}
            >
              New text document
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                openWindow('explorer', { path: '/Documents' })
                setBgMenu(null)
              }}
            >
              Open Documents
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                openWindow('settings')
                setBgMenu(null)
              }}
            >
              Personalize
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                openWindow('about')
                setBgMenu(null)
              }}
            >
              About
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                if (
                  window.confirm(
                    'Reload the page? Unsaved changes in open apps may be lost.',
                  )
                ) {
                  window.location.reload()
                }
                setBgMenu(null)
              }}
            >
              Refresh (reload page)
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}
