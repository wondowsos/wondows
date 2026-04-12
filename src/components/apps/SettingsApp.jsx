import { useRef, useState } from 'react'
import { THEME_LABELS, UI_THEMES, WALLPAPERS } from '../../constants'
import { useOs } from '../../context/OsContext'
import { MAX_CUSTOM_WALLPAPER_CHARS } from '../../lib/wallpaperStorage'
import { useFs } from '../../context/FsContext'
import {
  getSoundEffectsEnabled,
  playUiBeep,
  setSoundEffectsEnabled,
} from '../../lib/beep'

const WP_LABELS = {
  paint: 'Sky & grass',
  lava: 'Lava',
  void: 'Void',
  grid: 'Grid',
  neet: 'NEET (night interior)',
}

/** ~3 MiB raw file — base64 plus JSON must fit in localStorage */
const MAX_WALLPAPER_FILE_BYTES = 3_000_000

export default function SettingsApp() {
  const [soundFx, setSoundFx] = useState(() => getSoundEffectsEnabled())
  const [wpErr, setWpErr] = useState(null)
  const fileRef = useRef(null)
  const { wallpaper, setWallpaper, setCustomWallpaperDataUrl, theme, setTheme } =
    useOs()
  const { purgeTrash, trashCount } = useFs()

  const onWallpaperFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    setWpErr(null)
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setWpErr('Choose an image file (PNG, JPEG, GIF, or WebP).')
      return
    }
    if (f.size > MAX_WALLPAPER_FILE_BYTES) {
      setWpErr(
        'That file is too large. Try a smaller image (under about 3 MB).',
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (dataUrl.length > MAX_CUSTOM_WALLPAPER_CHARS) {
        setWpErr(
          'That image is too large after encoding. Try a smaller or more compressed file.',
        )
        return
      }
      const res = setCustomWallpaperDataUrl(dataUrl)
      if (!res.ok) setWpErr(res.error ?? 'Could not set wallpaper.')
    }
    reader.onerror = () => setWpErr('Could not read that file.')
    reader.readAsDataURL(f)
  }

  return (
    <div className="os-app-settings">
      <div className="os-settings-row os-settings-stack">
        <span>Theme</span>
        <div className="os-wp-picks">
          {UI_THEMES.map((id) => (
            <button
              key={id}
              type="button"
              className={`os-wp-chip${theme === id ? ' on' : ''}`}
              onClick={() => setTheme(id)}
            >
              {THEME_LABELS[id] ?? id}
            </button>
          ))}
        </div>
      </div>
      <div className="os-settings-row os-settings-stack">
        <span>Wallpaper</span>
        <div className="os-wp-picks">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            className="os-wallpaper-file-input"
            onChange={onWallpaperFile}
            aria-label="Choose custom wallpaper image"
          />
          <button
            type="button"
            className={`os-wp-chip${wallpaper.mode === 'custom' ? ' on' : ''}`}
            onClick={() => fileRef.current?.click()}
          >
            Your picture…
          </button>
          {wallpaper.mode === 'custom' ? (
            <button
              type="button"
              className="os-wp-chip"
              onClick={() => {
                setWpErr(null)
                setWallpaper(wallpaper.lastPresetId)
              }}
            >
              Use built-in only
            </button>
          ) : null}
          {WALLPAPERS.map((id) => (
            <button
              key={id}
              type="button"
              className={`os-wp-chip${
                wallpaper.mode === 'preset' && wallpaper.presetId === id
                  ? ' on'
                  : ''
              }`}
              onClick={() => {
                setWpErr(null)
                setWallpaper(id)
              }}
            >
              {WP_LABELS[id] ?? id}
            </button>
          ))}
        </div>
        {wpErr ? (
          <span className="os-settings-hint os-settings-hint--err">{wpErr}</span>
        ) : null}
      </div>
      <div className="os-settings-row">
        <span>Sound effects (beeps)</span>
        <button
          type="button"
          className={`os-toggle${soundFx ? ' on' : ''}`}
          onClick={() => {
            const next = !soundFx
            setSoundFx(next)
            setSoundEffectsEnabled(next)
            if (next) playUiBeep(55)
          }}
          aria-pressed={soundFx}
          aria-label="Sound effects"
        />
      </div>
      <div className="os-settings-row os-settings-stack">
        <span>Recycle Bin ({trashCount} items)</span>
        <button
          type="button"
          className="os-trash-empty-btn"
          onClick={() => {
            if (trashCount === 0) return
            if (window.confirm('Empty the Recycle Bin permanently?')) purgeTrash()
          }}
        >
          Empty Recycle Bin
        </button>
      </div>
      <div className="os-settings-row">
        <span>Product</span>
        <span style={{ color: 'var(--w-text-muted)', fontSize: 14 }}>Wondows</span>
      </div>
    </div>
  )
}
