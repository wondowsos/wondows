/** Remove toast/notification after exit transition. */
export function fadeRemove(el, visibleClass) {
  el.classList.remove(visibleClass)
  const done = () => el.remove()
  el.addEventListener('transitionend', done, { once: true })
  window.setTimeout(done, 400)
}

/**
 * × button; prepended so layout stays simple (absolute positioning in CSS).
 * @param {HTMLElement} el
 * @param {string} visibleClass
 */
export function addToastCloseButton(el, visibleClass = 'os-toast--visible') {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'os-toast-close'
  btn.setAttribute('aria-label', 'Dismiss notification')
  btn.textContent = '×'
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    fadeRemove(el, visibleClass)
  })
  el.classList.add('os-toast--has-close')
  el.prepend(btn)
}
