import { playSuccessChime } from './beep'
import { copyTextToClipboard } from './clipboard'
import { addToastCloseButton, fadeRemove } from './toastDismiss'

function solscanTxUrl(sig) {
  return `https://solscan.io/tx/${sig}`
}

function buildMintRow(mint) {
  const row = document.createElement('div')
  row.className = 'os-toast-token-mint-row'

  const code = document.createElement('code')
  code.className = 'os-toast-token-mint'
  code.textContent = mint
  code.title = mint

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'os-toast-token-copy'
  btn.textContent = 'Copy mint'
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    void (async () => {
      const ok = await copyTextToClipboard(mint)
      btn.textContent = ok ? 'Copied' : 'Copy failed'
      window.setTimeout(() => {
        btn.textContent = 'Copy mint'
      }, 1600)
    })()
  })

  row.append(code, btn)
  return row
}

function buildSolscanLink(signature) {
  const a = document.createElement('a')
  a.className = 'os-toast-token-link'
  a.href = solscanTxUrl(signature)
  a.target = '_blank'
  a.rel = 'noreferrer'
  a.textContent = 'View transaction on Solscan'
  return a
}

/**
 * Bottom toast + right-side card + chime when a pump token is created.
 * Both stay until the user dismisses them.
 */
export function notifyTokenCreated({ mint, signature }) {
  if (typeof document === 'undefined') return
  const m = String(mint ?? '').trim()
  const sig = String(signature ?? '').trim()
  if (!m || !sig) return

  playSuccessChime()

  document.querySelectorAll('.os-side-notify--token').forEach((n) => n.remove())

  const toast = document.createElement('div')
  toast.className = 'os-toast os-toast--interactive os-toast--token-success'
  toast.setAttribute('role', 'status')

  const title = document.createElement('p')
  title.className = 'os-toast-token-title'
  title.textContent = 'Token created'

  const sub = document.createElement('p')
  sub.className = 'os-toast-token-sub'
  sub.textContent = 'Submitted on-chain'

  toast.append(title, sub, buildMintRow(m), buildSolscanLink(sig))
  addToastCloseButton(toast, 'os-toast--visible')
  document.body.appendChild(toast)

  requestAnimationFrame(() => toast.classList.add('os-toast--visible'))

  const side = document.createElement('aside')
  side.className = 'os-side-notify os-side-notify--token'
  side.setAttribute('aria-label', 'Token created')

  const sideHead = document.createElement('div')
  sideHead.className = 'os-side-notify-head'

  const sideTitle = document.createElement('span')
  sideTitle.className = 'os-side-notify-title'
  sideTitle.textContent = 'Token created'

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'os-side-notify-close'
  close.setAttribute('aria-label', 'Dismiss')
  close.textContent = '×'
  close.addEventListener('click', () => fadeRemove(side, 'os-side-notify--visible'))

  sideHead.append(sideTitle, close)

  const sideBody = document.createElement('div')
  sideBody.className = 'os-side-notify-body'
  sideBody.append(buildMintRow(m), buildSolscanLink(sig))

  side.append(sideHead, sideBody)
  document.body.appendChild(side)

  requestAnimationFrame(() => side.classList.add('os-side-notify--visible'))
}
