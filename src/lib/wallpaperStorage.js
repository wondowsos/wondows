import { WALLPAPERS } from '../constants'

/** @typedef {{ mode: 'preset', presetId: string }} WallpaperPreset */
/** @typedef {{ mode: 'custom', dataUrl: string, lastPresetId: string }} WallpaperCustom */
/** @typedef {WallpaperPreset | WallpaperCustom} WallpaperState */

const DEFAULT_PRESET = 'paint'

const ALLOWED_IMAGE_PREFIXES = [
  'data:image/png',
  'data:image/jpeg',
  'data:image/jpg',
  'data:image/gif',
  'data:image/webp',
]

/** Max stored payload (~4MiB base64) — localStorage is typically 5MB total */
export const MAX_CUSTOM_WALLPAPER_CHARS = 4_500_000

export function defaultWallpaper() {
  return { mode: 'preset', presetId: DEFAULT_PRESET }
}

/**
 * @param {string | null} raw
 * @returns {WallpaperState}
 */
export function parseWallpaperStored(raw) {
  if (!raw || typeof raw !== 'string') return defaultWallpaper()
  try {
    const o = JSON.parse(raw)
    if (o && o.v === 2) {
      if (typeof o.custom === 'string' && isAllowedDataImageUrl(o.custom)) {
        const last =
          typeof o.lastPreset === 'string' && WALLPAPERS.includes(o.lastPreset)
            ? o.lastPreset
            : DEFAULT_PRESET
        return { mode: 'custom', dataUrl: o.custom, lastPresetId: last }
      }
      if (typeof o.preset === 'string' && WALLPAPERS.includes(o.preset)) {
        return { mode: 'preset', presetId: o.preset }
      }
    }
  } catch {
    /* legacy plain id */
  }
  if (WALLPAPERS.includes(raw)) {
    return { mode: 'preset', presetId: raw }
  }
  return defaultWallpaper()
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isAllowedDataImageUrl(url) {
  if (typeof url !== 'string' || url.length > MAX_CUSTOM_WALLPAPER_CHARS) {
    return false
  }
  const semi = url.indexOf(';')
  const comma = url.indexOf(',')
  if (semi < 10 || comma < semi) return false
  const header = url.slice(0, semi).toLowerCase()
  if (!ALLOWED_IMAGE_PREFIXES.some((p) => header === p)) return false
  if (url.slice(semi + 1, comma).toLowerCase() !== 'base64') return false
  return true
}

/**
 * @param {WallpaperState} w
 * @returns {string}
 */
export function serializeWallpaper(w) {
  if (w.mode === 'custom') {
    return JSON.stringify({
      v: 2,
      custom: w.dataUrl,
      lastPreset: w.lastPresetId,
    })
  }
  return JSON.stringify({ v: 2, preset: w.presetId })
}
