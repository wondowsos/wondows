/** Short-lived message; no dependency. */
export function showOsToast(message) {
  if (typeof document === 'undefined') return
  const text = String(message ?? '').trim()
  if (!text) return

  const el = document.createElement('div')
  el.className = 'os-toast'
  el.setAttribute('role', 'status')
  el.textContent = text
  document.body.appendChild(el)

  requestAnimationFrame(() => {
    el.classList.add('os-toast--visible')
  })

  const remove = () => {
    el.classList.remove('os-toast--visible')
    const done = () => {
      el.remove()
    }
    el.addEventListener('transitionend', done, { once: true })
    window.setTimeout(done, 400)
  }

  window.setTimeout(remove, 3200)
}
