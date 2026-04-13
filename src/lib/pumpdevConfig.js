/**
 * PumpDev API base (see https://pumpdev.io/welcome).
 * In dev, defaults to same-origin `/api/pumpdev` so Vite can proxy and avoid surprises.
 * In production, calls https://pumpdev.io directly (CORS allows browser requests).
 */
export function getPumpdevApiBase() {
  const v = import.meta.env.VITE_PUMPDEV_API_BASE?.trim()
  if (v) return v.replace(/\/$/, '')
  if (import.meta.env.DEV) return '/api/pumpdev'
  return 'https://pumpdev.io'
}
