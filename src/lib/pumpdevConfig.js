/**
 * PumpDev API base (see https://pumpdev.io/welcome).
 * In dev, defaults to same-origin `/api/pumpdev` so Vite can proxy and avoid surprises.
 * In production, calls https://pumpdev.io directly (CORS allows browser requests).
 */
export function getPumpdevApiBase() {
  const v = import.meta.env.VITE_PUMPDEV_API_BASE?.trim()
  if (v) {
    const b = v.replace(/\/$/, '')
    if (b === '') {
      if (import.meta.env.DEV) return '/api/pumpdev'
      return 'https://pumpdev.io'
    }
    return b
  }
  if (import.meta.env.DEV) return '/api/pumpdev'
  return 'https://pumpdev.io'
}

/**
 * WebSocket URL for PumpDev streams (see https://pumpdev.io/data-api — WSS /ws).
 * Dev uses the same `/api/pumpdev` origin with `ws: true` in Vite proxy.
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
