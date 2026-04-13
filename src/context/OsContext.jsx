import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { STORAGE_KEYS, UI_THEMES, WALLPAPERS } from '../constants'
import {
  defaultWallpaper,
  isAllowedDataImageUrl,
  parseWallpaperStored,
  serializeWallpaper,
} from '../lib/wallpaperStorage'

const DESKTOP_PADDING = 8
const TASKBAR_H = 58

function readStoredWallpaper() {
  if (typeof localStorage === 'undefined') return defaultWallpaper()
  try {
    const v = localStorage.getItem(STORAGE_KEYS.wallpaper)
    return parseWallpaperStored(v)
  } catch {
    /* ignore */
  }
  return defaultWallpaper()
}

function readStoredTheme() {
  if (typeof localStorage === 'undefined') return 'classic'
  try {
    const v = localStorage.getItem(STORAGE_KEYS.uiTheme)
    if (UI_THEMES.includes(v)) return v
  } catch {
    /* ignore */
  }
  return 'classic'
}

const DEFAULTS = {
  notepad: { w: 540, h: 420, title: 'Notepad' },
  browse: { w: 720, h: 480, title: 'Browser' },
  settings: { w: 500, h: 480, title: 'Settings' },
  terminal: { w: 580, h: 380, title: 'Terminal' },
  about: { w: 400, h: 340, title: 'About' },
  explorer: { w: 660, h: 460, title: 'File Explorer' },
  calculator: { w: 300, h: 420, title: 'Calculator' },
  wallet: { w: 580, h: 640, title: 'Wallet' },
  pumpfun: { w: 540, h: 640, title: 'Token Studio' },
  paint: { w: 520, h: 520, title: 'Paint' },
  mines: { w: 420, h: 560, title: 'Minesweeper' },
  clock: { w: 380, h: 440, title: 'Clock' },
  meteora: { w: 420, h: 280, title: 'Meteora' },
}

function windowTitle(type, def, payload) {
  if (payload?.title) return payload.title
  if (type === 'notepad' && payload?.filePath) {
    return `${baseFile(payload.filePath)} - Notepad`
  }
  if (type === 'explorer' && payload?.path) {
    return payload.path === '/' ? 'This PC' : `Files - ${payload.path}`
  }
  if (type === 'paint' && payload?.filePath) {
    return `${baseFile(payload.filePath)} - Paint`
  }
  return def.title
}

function baseFile(p) {
  const i = p.lastIndexOf('/')
  return i >= 0 ? p.slice(i + 1) : p
}

function centerPosition(w, h, vw, vh) {
  return {
    x: Math.max(DESKTOP_PADDING, (vw - w) / 2),
    y: Math.max(DESKTOP_PADDING, (vh - h - TASKBAR_H) / 2),
  }
}

function nextZIndex(prev) {
  return prev.reduce((m, w) => Math.max(m, w.zIndex), 100) + 1
}

const OsContext = createContext(null)

export function OsProvider({ children }) {
  const [windows, setWindows] = useState([])
  const [focusedId, setFocusedId] = useState(null)
  const [startOpen, setStartOpen] = useState(false)
  const [wallpaper, setWallpaperState] = useState(readStoredWallpaper)
  const [theme, setThemeState] = useState(readStoredTheme)

  const setTheme = useCallback((id) => {
    if (!UI_THEMES.includes(id)) return
    setThemeState(id)
    try {
      localStorage.setItem(STORAGE_KEYS.uiTheme, id)
    } catch {
      /* ignore */
    }
  }, [])

  const setWallpaper = useCallback((id) => {
    if (!WALLPAPERS.includes(id)) return
    const next = { mode: 'preset', presetId: id }
    setWallpaperState(next)
    try {
      localStorage.setItem(STORAGE_KEYS.wallpaper, serializeWallpaper(next))
    } catch {
      /* ignore */
    }
  }, [])

  const setCustomWallpaperDataUrl = useCallback((dataUrl) => {
    if (!isAllowedDataImageUrl(dataUrl)) {
      return { ok: false, error: 'Use a PNG, JPEG, GIF, or WebP image.' }
    }
    let saveError = null
    setWallpaperState((prev) => {
      const lastPresetId =
        prev.mode === 'preset' ? prev.presetId : prev.lastPresetId
      const next = { mode: 'custom', dataUrl, lastPresetId }
      try {
        localStorage.setItem(STORAGE_KEYS.wallpaper, serializeWallpaper(next))
      } catch (e) {
        const name = e && typeof e === 'object' ? e.name : ''
        saveError =
          name === 'QuotaExceededError'
            ? 'Image is too large to store locally. Try a smaller or more compressed file.'
            : 'Could not save wallpaper.'
        return prev
      }
      return next
    })
    if (saveError) return { ok: false, error: saveError }
    return { ok: true }
  }, [])

  const openWindow = useCallback((type, payload = null) => {
    const def = DEFAULTS[type]
    if (!def) return

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const { x, y } = centerPosition(def.w, def.h, vw, vh)

    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `w-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const title = windowTitle(type, def, payload)

    setWindows((prev) => {
      const offset = (prev.filter((w) => w.type === type).length % 5) * 28
      const z = nextZIndex(prev)
      return [
        ...prev,
        {
          id,
          type,
          title,
          x: x + offset,
          y: y + offset,
          w: def.w,
          h: def.h,
          minimized: false,
          maximized: false,
          restore: null,
          zIndex: z,
          payload: payload ?? undefined,
        },
      ]
    })
    setFocusedId(id)
    setStartOpen(false)
  }, [])

  const updateWindow = useCallback((id, patch) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    )
  }, [])

  const focusWindow = useCallback((id) => {
    setFocusedId(id)
    setWindows((prev) => {
      const z = nextZIndex(prev)
      return prev.map((w) =>
        w.id === id ? { ...w, zIndex: z, minimized: false } : w,
      )
    })
  }, [])

  const closeWindow = useCallback((id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
    setFocusedId((cur) => (cur === id ? null : cur))
  }, [])

  const minimizeWindow = useCallback((id) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    )
    setFocusedId((cur) => (cur === id ? null : cur))
  }, [])

  const toggleMaximize = useCallback((id) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w
        if (w.maximized) {
          const r = w.restore
          return r
            ? {
                ...w,
                maximized: false,
                x: r.x,
                y: r.y,
                w: r.w,
                h: r.h,
                restore: null,
              }
            : { ...w, maximized: false, restore: null }
        }
        const restore = { x: w.x, y: w.y, w: w.w, h: w.h }
        const vw = window.innerWidth
        const vh = window.innerHeight - TASKBAR_H
        return {
          ...w,
          maximized: true,
          restore,
          x: 0,
          y: 0,
          w: vw,
          h: vh,
        }
      }),
    )
  }, [])

  const moveWindow = useCallback((id, x, y) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, x, y } : w)),
    )
  }, [])

  const toggleStart = useCallback(() => {
    setStartOpen((o) => !o)
  }, [])

  const value = useMemo(
    () => ({
      windows,
      focusedId,
      startOpen,
      wallpaper,
      setWallpaper,
      setCustomWallpaperDataUrl,
      theme,
      setTheme,
      openWindow,
      updateWindow,
      focusWindow,
      closeWindow,
      minimizeWindow,
      toggleMaximize,
      moveWindow,
      toggleStart,
      setStartOpen,
    }),
    [
      windows,
      focusedId,
      startOpen,
      wallpaper,
      setWallpaper,
      setCustomWallpaperDataUrl,
      theme,
      setTheme,
      openWindow,
      updateWindow,
      focusWindow,
      closeWindow,
      minimizeWindow,
      toggleMaximize,
      moveWindow,
      toggleStart,
    ],
  )

  return <OsContext.Provider value={value}>{children}</OsContext.Provider>
}

/* eslint-disable react-refresh/only-export-components -- hook + provider share one module */
export function useOs() {
  const ctx = useContext(OsContext)
  if (!ctx) throw new Error('useOs must be used within OsProvider')
  return ctx
}
