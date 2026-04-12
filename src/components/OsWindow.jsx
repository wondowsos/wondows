import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Draggable from 'react-draggable'
import { Minus, Square, X } from 'lucide-react'
import { useOs } from '../context/OsContext'
import NotepadApp from './apps/NotepadApp'
import BrowseApp from './apps/BrowseApp'
import SettingsApp from './apps/SettingsApp'
import TerminalApp from './apps/TerminalApp'
import AboutApp from './apps/AboutApp'
import ExplorerApp from './apps/ExplorerApp'
import CalculatorApp from './apps/CalculatorApp'
import WalletApp from './apps/WalletApp'
import PaintApp from './apps/PaintApp'
import MinesApp from './apps/MinesApp'
import ClockApp from './apps/ClockApp'

const PumpFunApp = lazy(() => import('./apps/PumpFunApp'))

function WindowContent({ type, payload, windowId }) {
  switch (type) {
    case 'notepad':
      return <NotepadApp payload={payload} windowId={windowId} />
    case 'browse':
      return <BrowseApp payload={payload} />
    case 'settings':
      return <SettingsApp />
    case 'terminal':
      return <TerminalApp />
    case 'about':
      return <AboutApp />
    case 'explorer':
      return <ExplorerApp payload={payload} />
    case 'calculator':
      return <CalculatorApp />
    case 'wallet':
      return <WalletApp />
    case 'pumpfun':
      return (
        <Suspense fallback={<div className="os-app-lazy-fallback">Loading…</div>}>
          <PumpFunApp />
        </Suspense>
      )
    case 'paint':
      return <PaintApp payload={payload} />
    case 'mines':
      return <MinesApp />
    case 'clock':
      return <ClockApp />
    default:
      return null
  }
}

const TASKBAR_H = 58
const RESIZE_PAD = 6
const MIN_W = 280
const MIN_H = 160

function TitleIcon({ type }) {
  switch (type) {
    case 'notepad':
      return <span style={{ fontSize: 12 }}>📄</span>
    case 'browse':
      return <span style={{ fontSize: 12 }}>🌐</span>
    case 'settings':
      return <span style={{ fontSize: 12 }}>⚙</span>
    case 'terminal':
      return <span style={{ fontSize: 12 }}>▸</span>
    case 'about':
      return <span style={{ fontSize: 12 }}>🖥</span>
    case 'explorer':
      return <span style={{ fontSize: 12 }}>📁</span>
    case 'calculator':
      return <span style={{ fontSize: 12 }}>🔢</span>
    case 'wallet':
      return <span style={{ fontSize: 12 }}>◈</span>
    case 'pumpfun':
      return <span style={{ fontSize: 12 }}>💊</span>
    case 'paint':
      return <span style={{ fontSize: 12 }}>🎨</span>
    case 'mines':
      return <span style={{ fontSize: 12 }}>💣</span>
    case 'clock':
      return <span style={{ fontSize: 12 }}>🕐</span>
    default:
      return null
  }
}

export default function OsWindow({ win }) {
  const {
    focusedId,
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    moveWindow,
    updateWindow,
  } = useOs()

  const nodeRef = useRef(null)
  const active = focusedId === win.id
  const [titleMenu, setTitleMenu] = useState(null)

  useEffect(() => {
    if (!titleMenu) return
    const close = () => setTitleMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [titleMenu])

  const onResizePointerDown = useCallback(
    (e, dir) => {
      if (win.maximized) return
      e.preventDefault()
      e.stopPropagation()
      focusWindow(win.id)
      const start = {
        cx: e.clientX,
        cy: e.clientY,
        w: win.w,
        h: win.h,
        x: win.x,
        y: win.y,
      }

      const clampSize = (nw, nh) => {
        const maxW = window.innerWidth - start.x - RESIZE_PAD
        const maxH = window.innerHeight - TASKBAR_H - start.y - RESIZE_PAD
        return {
          w: Math.max(MIN_W, Math.min(Math.round(nw), maxW)),
          h: Math.max(MIN_H, Math.min(Math.round(nh), maxH)),
        }
      }

      const onMove = (ev) => {
        const dx = ev.clientX - start.cx
        const dy = ev.clientY - start.cy
        let nw = start.w
        let nh = start.h
        if (dir === 'e' || dir === 'se') nw = start.w + dx
        if (dir === 's' || dir === 'se') nh = start.h + dy
        const next = clampSize(nw, nh)
        updateWindow(win.id, { w: next.w, h: next.h })
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [win.maximized, win.w, win.h, win.x, win.y, win.id, focusWindow, updateWindow],
  )

  if (win.minimized) return null

  const shell = (
    <div
      ref={nodeRef}
      className={`os-window-wrap${win.maximized ? ' maximized' : ''}${active ? '' : ' inactive'}`}
      style={{
        zIndex: win.zIndex,
        width: win.maximized ? '100%' : win.w,
        height: win.maximized ? '100%' : win.h,
        position: 'absolute',
        left: win.maximized ? 0 : undefined,
        top: win.maximized ? 0 : undefined,
      }}
      onMouseDown={() => focusWindow(win.id)}
      role="presentation"
    >
      <div
        className="os-titlebar"
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          focusWindow(win.id)
          setTitleMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        <div className="os-titlebar-drag" data-drag-handle>
          <span className="os-titlebar-icon">
            <TitleIcon type={win.type} />
          </span>
          <span className="os-titlebar-title">{win.title}</span>
        </div>
        <div className="os-titlebar-controls">
          <button
            type="button"
            className="os-ctrl minimize"
            aria-label="Minimize"
            onClick={() => minimizeWindow(win.id)}
          >
            <Minus size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="os-ctrl maximize"
            aria-label={win.maximized ? 'Restore' : 'Maximize'}
            onClick={() => toggleMaximize(win.id)}
          >
            <Square size={11} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="os-ctrl close"
            aria-label="Close"
            onClick={() => closeWindow(win.id)}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <div className="os-window-body">
        <WindowContent
          type={win.type}
          payload={win.payload}
          windowId={win.id}
        />
      </div>
      {titleMenu ? (
        <ul
          className="os-ctx-menu"
          style={{
            position: 'fixed',
            left: Math.min(
              titleMenu.x,
              typeof window !== 'undefined' ? window.innerWidth - 200 : titleMenu.x,
            ),
            top: Math.min(
              titleMenu.y,
              typeof window !== 'undefined' ? window.innerHeight - 160 : titleMenu.y,
            ),
            zIndex: 20100,
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
                minimizeWindow(win.id)
                setTitleMenu(null)
              }}
            >
              Minimize
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                toggleMaximize(win.id)
                setTitleMenu(null)
              }}
            >
              {win.maximized ? 'Restore' : 'Maximize'}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item os-ctx-danger"
              onClick={() => {
                closeWindow(win.id)
                setTitleMenu(null)
              }}
            >
              Close
            </button>
          </li>
        </ul>
      ) : null}
      {!win.maximized ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            className="os-resize-edge os-resize-edge--s"
            aria-hidden
            onPointerDown={(e) => onResizePointerDown(e, 's')}
          />
          <button
            type="button"
            tabIndex={-1}
            className="os-resize-edge os-resize-edge--e"
            aria-hidden
            onPointerDown={(e) => onResizePointerDown(e, 'e')}
          />
          <button
            type="button"
            tabIndex={-1}
            className="os-resize-corner"
            aria-label="Resize window"
            onPointerDown={(e) => onResizePointerDown(e, 'se')}
          />
        </>
      ) : null}
    </div>
  )

  if (win.maximized) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: win.zIndex,
        }}
        onMouseDown={() => focusWindow(win.id)}
      >
        {shell}
      </div>
    )
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".os-titlebar-drag"
      cancel=".os-titlebar-controls,.os-resize-edge,.os-resize-corner"
      position={{ x: win.x, y: win.y }}
      onStop={(_, data) => moveWindow(win.id, data.x, data.y)}
      bounds="parent"
    >
      {shell}
    </Draggable>
  )
}
