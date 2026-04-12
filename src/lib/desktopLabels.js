import { STORAGE_KEYS } from '../constants'
import { baseName } from '../fs/wondowsFs'

export const FILE_ICON_PREFIX = 'file:'

export const DEFAULT_DESKTOP_LABELS = {
  trash: 'Recycle Bin',
  pc: 'This PC',
  files: 'Documents',
  notepad: 'Notepad',
  browse: 'Browser',
  paint: 'Paint',
  mines: 'Minesweeper',
  clock: 'Clock',
  calc: 'Calculator',
  wallet: 'Wallet',
  pumpfun: 'Token Studio',
  settings: 'Settings',
  terminal: 'Terminal',
}

const MAX_LEN = 48

export function loadDesktopLabelOverrides() {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.desktopLabels)
    if (!raw) return {}
    const o = JSON.parse(raw)
    if (typeof o !== 'object' || o === null || Array.isArray(o)) return {}
    const out = {}
    for (const [k, v] of Object.entries(o)) {
      if (typeof v !== 'string') continue
      const t = v.trim().slice(0, MAX_LEN)
      if (!t) continue
      const isBuiltin = Object.prototype.hasOwnProperty.call(
        DEFAULT_DESKTOP_LABELS,
        k,
      )
      const isFileKey = k.startsWith(`${FILE_ICON_PREFIX}/`)
      if (isBuiltin || isFileKey) out[k] = t
    }
    return out
  } catch {
    return {}
  }
}

export function saveDesktopLabelOverrides(overrides) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.desktopLabels, JSON.stringify(overrides))
  } catch {
    /* ignore */
  }
}

export function mergeDesktopLabels(overrides) {
  const merged = { ...DEFAULT_DESKTOP_LABELS }
  for (const id of Object.keys(DEFAULT_DESKTOP_LABELS)) {
    if (overrides[id]) merged[id] = overrides[id]
  }
  return merged
}

export function fileDesktopIconId(vfsPath) {
  return `${FILE_ICON_PREFIX}${vfsPath}`
}

export function parseFileDesktopIconId(iconId) {
  if (!iconId.startsWith(FILE_ICON_PREFIX)) return null
  const path = iconId.slice(FILE_ICON_PREFIX.length)
  return path.startsWith('/') ? path : null
}

export function getFileDesktopLabel(vfsPath, overrides) {
  const k = fileDesktopIconId(vfsPath)
  return overrides[k] ?? baseName(vfsPath)
}
