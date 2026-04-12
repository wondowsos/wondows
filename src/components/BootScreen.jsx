import { useCallback, useEffect, useRef, useState } from 'react'

const BLOCKS = 18

const T_TEXT = 1200
const T_GUI = 1900
const T_PROGRESS = 2800
const T_FADE = 600

function reducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function BootScreen({ onComplete }) {
  const [phase, setPhase] = useState('text')
  const [filled, setFilled] = useState(0)
  const completedRef = useRef(false)
  const timersRef = useRef([])
  const rafRef = useRef(0)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const safeComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    onCompleteRef.current?.()
  }, [])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  const finishWithFade = useCallback(() => {
    setPhase('fade')
    const t = window.setTimeout(() => safeComplete(), T_FADE)
    timersRef.current.push(t)
  }, [safeComplete])

  useEffect(() => {
    if (reducedMotion()) {
      const t = window.setTimeout(() => safeComplete(), 80)
      return () => clearTimeout(t)
    }

    timersRef.current.push(
      window.setTimeout(() => setPhase('gui'), T_TEXT),
      window.setTimeout(() => {
        setPhase('progress')
        const start = performance.now()
        const tick = (now) => {
          if (completedRef.current) return
          const elapsed = now - start
          const next = Math.min(
            BLOCKS,
            Math.floor((elapsed / T_PROGRESS) * BLOCKS),
          )
          setFilled(next)
          if (elapsed < T_PROGRESS) {
            rafRef.current = requestAnimationFrame(tick)
          } else {
            setFilled(BLOCKS)
            clearTimers()
            finishWithFade()
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }, T_TEXT + T_GUI),
    )

    return clearTimers
  }, [clearTimers, finishWithFade, safeComplete])

  if (reducedMotion()) {
    return null
  }

  return (
    <div className={`os-boot os-boot--${phase}`} role="presentation">
      {phase === 'text' ? (
        <div className="os-boot-textmode">
          <p className="os-boot-textmode-line">
            Starting Wondows<span className="os-boot-cursor">_</span>
          </p>
        </div>
      ) : null}

      {phase === 'gui' || phase === 'progress' || phase === 'fade' ? (
        <div className="os-boot-gui">
          <div className="os-boot-clouds" aria-hidden />
          <div className="os-boot-flag" aria-hidden />
          <div className="os-boot-brand">
            <span className="os-boot-brand-w">W</span>
            <span className="os-boot-brand-rest">ondows</span>
          </div>
          <p className="os-boot-tagline">Please wait while your desktop loads.</p>
          {(phase === 'progress' || phase === 'fade') && (
            <div className="os-boot-progress" aria-hidden>
              {Array.from({ length: BLOCKS }, (_, i) => (
                <span
                  key={i}
                  className={`os-boot-block${i < filled ? ' on' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
