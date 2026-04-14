import { addToastCloseButton } from './toastDismiss'

/** Stays visible until the user dismisses it. */
export function showOsToast(message) {
  if (typeof document === 'undefined') return
  const text = String(message ?? '').trim()
  if (!text) return

  const el = document.createElement('div')
  el.className = 'os-toast os-toast--dismissible'
  el.setAttribute('role', 'alert')

  const body = document.createElement('div')
  body.className = 'os-toast-plain-body'
  body.textContent = text

  el.append(body)
  addToastCloseButton(el, 'os-toast--visible')
  document.body.appendChild(el)

  requestAnimationFrame(() => {
    el.classList.add('os-toast--visible')
  })
}
