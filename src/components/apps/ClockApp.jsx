import { useEffect, useRef, useState } from 'react'

function formatHms(ms) {
  if (ms < 0) ms = 0
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const cs = Math.floor((ms % 1000) / 10)
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(cs, 2)}`
}

export default function ClockApp() {
  const [now, setNow] = useState(() => new Date())
  const [swRunning, setSwRunning] = useState(false)
  const [swDisplay, setSwDisplay] = useState(0)
  const swStart = useRef(null)
  const swAccum = useRef(0)
  const raf = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!swRunning) {
      if (raf.current) cancelAnimationFrame(raf.current)
      return undefined
    }
    const tick = () => {
      const base = swStart.current ?? Date.now()
      setSwDisplay(swAccum.current + (Date.now() - base))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [swRunning])

  const startStop = () => {
    if (swRunning) {
      swAccum.current += Date.now() - (swStart.current ?? Date.now())
      swStart.current = null
      setSwRunning(false)
      setSwDisplay(swAccum.current)
    } else {
      swStart.current = Date.now()
      setSwRunning(true)
    }
  }

  const resetSw = () => {
    swAccum.current = 0
    swStart.current = null
    setSwDisplay(0)
    setSwRunning(false)
  }

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="os-app-clock">
      <div className="os-clock-hero">
        <div className="os-clock-label">Local time</div>
        <div className="os-clock-digits" aria-live="polite">
          {timeStr}
        </div>
        <div className="os-clock-date">{dateStr}</div>
      </div>
      <p className="os-clock-fact">Shows the time from this device.</p>
      <div className="os-clock-sw">
        <div className="os-clock-sw-title">Stopwatch</div>
        <div className="os-clock-sw-readout">{formatHms(swDisplay)}</div>
        <div className="os-clock-sw-btns">
          <button type="button" className="os-clock-btn" onClick={startStop}>
            {swRunning ? 'Pause' : 'Start'}
          </button>
          <button type="button" className="os-clock-btn" onClick={resetSw}>
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
