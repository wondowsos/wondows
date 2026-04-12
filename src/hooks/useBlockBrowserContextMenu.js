import { useEffect } from 'react'

/**
 * Allow the real browser menu only where OS text editing still needs it.
 * Opt out of blocking with data-os-allow-native-context on an ancestor.
 */
export function allowBrowserContextMenu(target) {
  if (!target || !(target instanceof Element)) return false
  if (target.closest('[data-os-allow-native-context]')) return true
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (target.getAttribute('type') || 'text').toLowerCase()
    return (
      type === '' ||
      type === 'text' ||
      type === 'search' ||
      type === 'password' ||
      type === 'email' ||
      type === 'url' ||
      type === 'tel' ||
      type === 'number'
    )
  }
  return false
}

/** Block the browser default context menu for the desktop shell (capture phase). */
export function useBlockBrowserContextMenu() {
  useEffect(() => {
    const onContextMenu = (e) => {
      if (allowBrowserContextMenu(e.target)) return
      e.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu, true)
    return () => document.removeEventListener('contextmenu', onContextMenu, true)
  }, [])
}
