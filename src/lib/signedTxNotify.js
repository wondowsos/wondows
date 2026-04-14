/**
 * Bottom toast for successful signed transactions (Solscan link).
 * Stays until the user dismisses it.
 */
import { addToastCloseButton } from './toastDismiss'

function buildSolscanLink(signature) {
  const a = document.createElement('a')
  a.className = 'os-toast-token-link'
  a.href = `https://solscan.io/tx/${encodeURIComponent(signature)}`
  a.target = '_blank'
  a.rel = 'noreferrer'
  a.textContent = 'View transaction on Solscan'
  return a
}

/**
 * @param {{ title: string, subtitle?: string, signature: string }} opts
 */
export function notifySignedTx({ title, subtitle, signature }) {
  if (typeof document === 'undefined') return
  const sig = String(signature ?? '').trim()
  const t = String(title ?? '').trim()
  if (!sig || !t) return

  const toast = document.createElement('div')
  toast.className = 'os-toast os-toast--interactive os-toast--token-success'
  toast.setAttribute('role', 'status')

  const titleEl = document.createElement('p')
  titleEl.className = 'os-toast-token-title'
  titleEl.textContent = t

  toast.append(titleEl)

  const sub = String(subtitle ?? '').trim()
  if (sub) {
    const subEl = document.createElement('p')
    subEl.className = 'os-toast-token-sub'
    subEl.textContent = sub
    toast.append(subEl)
  }

  toast.append(buildSolscanLink(sig))
  addToastCloseButton(toast, 'os-toast--visible')
  document.body.appendChild(toast)

  requestAnimationFrame(() => toast.classList.add('os-toast--visible'))
}
