/**
 * Dev server proxy (`/api/pumpdev`) runs on the machine hosting Vite. If you open the app via a
 * LAN or VPS IP (not localhost), that proxy often returns 502 when the server cannot reach
 * pumpdev.io reliably. In that case we call https://pumpdev.io from the browser instead (CORS).
 */
function pumpdevDevProxyIsLocalhost() {
  if (typeof window === 'undefined') return true
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
}

/**
 * PumpDev API base (see https://pumpdev.io/welcome).
 * In dev on localhost, defaults to `/api/pumpdev` (Vite proxy). Otherwise `https://pumpdev.io`.
 */
export function getPumpdevApiBase() {
  const v = import.meta.env.VITE_PUMPDEV_API_BASE?.trim()
  if (v) {
    const b = v.replace(/\/$/, '')
    if (b === '') {
      if (import.meta.env.DEV) {
        return pumpdevDevProxyIsLocalhost() ? '/api/pumpdev' : 'https://pumpdev.io'
      }
      return 'https://pumpdev.io'
    }
    return b
  }
  if (import.meta.env.DEV) {
    return pumpdevDevProxyIsLocalhost() ? '/api/pumpdev' : 'https://pumpdev.io'
  }
  return 'https://pumpdev.io'
}

/**
 * WebSocket URL for PumpDev streams (see https://pumpdev.io/data-api — WSS /ws).
 * With a direct HTTPS base, uses `wss://pumpdev.io/ws`. On localhost dev, uses the Vite proxy.
 */
export function getPumpdevWsUrl() {
  const base = getPumpdevApiBase()
  if (base.startsWith('https://')) {
    return `${base.replace(/^https/, 'wss')}/ws`
  }
  if (base.startsWith('http://')) {
    return `${base.replace(/^http/, 'ws')}/ws`
  }
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}${base}/ws`
  }
  return 'wss://pumpdev.io/ws'
}
