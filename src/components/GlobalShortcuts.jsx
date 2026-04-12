import { useEffect } from 'react'
import { useOs } from '../context/OsContext'

function isTypingTarget(el) {
  if (!el || !(el instanceof Element)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  if (el.closest('[data-os-no-global-shortcuts]')) return true
  return false
}

/** Alt+Shift shortcuts when focus is not in an input (opens common apps). */
export default function GlobalShortcuts() {
  const { openWindow } = useOs()

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!e.altKey || !e.shiftKey || e.metaKey || e.ctrlKey) return
      if (isTypingTarget(e.target)) return

      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key

      const map = {
        e: () => openWindow('explorer', { path: '/Documents' }),
        f: () => openWindow('explorer', { path: '/' }),
        n: () => openWindow('notepad'),
        b: () => openWindow('browse'),
        t: () => openWindow('terminal'),
        c: () => openWindow('calculator'),
        s: () => openWindow('settings'),
        w: () => openWindow('wallet'),
        p: () => openWindow('pumpfun'),
        m: () => openWindow('mines'),
        d: () => openWindow('paint'),
        l: () => openWindow('clock'),
      }

      const fn = map[k]
      if (!fn) return
      e.preventDefault()
      fn()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openWindow])

  return null
}
