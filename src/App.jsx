import { useCallback, useState } from 'react'
import BootScreen from './components/BootScreen'
import Desktop from './components/Desktop'
import GlobalShortcuts from './components/GlobalShortcuts'
import OsWindow from './components/OsWindow'
import Taskbar from './components/Taskbar'
import { FsProvider } from './context/FsContext'
import { OsProvider, useOs } from './context/OsContext'
import { useBlockBrowserContextMenu } from './hooks/useBlockBrowserContextMenu'
import './App.css'
import './os.css'

function shouldSkipBootAnimation() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Shell() {
  useBlockBrowserContextMenu()
  const { windows, wallpaper, theme } = useOs()

  const wallpaperEl =
    wallpaper.mode === 'custom' ? (
      <div
        className="os-wallpaper os-wp--custom"
        style={{ backgroundImage: `url(${wallpaper.dataUrl})` }}
        aria-hidden
      />
    ) : (
      <div
        className={`os-wallpaper os-wp--${wallpaper.presetId}`}
        aria-hidden
      />
    )

  return (
    <div className="os-root" data-theme={theme}>
      {wallpaperEl}
      <Desktop />
      <GlobalShortcuts />
      <div className="os-windows-layer">
        {windows.map((w) => (
          <OsWindow key={w.id} win={w} />
        ))}
      </div>
      <Taskbar />
    </div>
  )
}

function AppShell() {
  const [bootDone, setBootDone] = useState(shouldSkipBootAnimation)
  const onBootComplete = useCallback(() => setBootDone(true), [])

  return (
    <>
      <Shell />
      {!bootDone ? <BootScreen onComplete={onBootComplete} /> : null}
    </>
  )
}

export default function App() {
  return (
    <OsProvider>
      <FsProvider>
        <AppShell />
      </FsProvider>
    </OsProvider>
  )
}
