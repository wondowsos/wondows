import { useCallback, useEffect, useRef, useState } from 'react'
import { useFs } from '../../context/FsContext'
import { baseName, childPath } from '../../fs/wondowsFs'

const PAINT_MAGIC = 'WONDOWS_PAINT_V1\n'

const COLORS = [
  { id: 'ink', hex: '#111111', label: 'Black' },
  { id: 'red', hex: '#d32f2f', label: 'Red' },
  { id: 'blue', hex: '#1976d2', label: 'Blue' },
  { id: 'green', hex: '#388e3c', label: 'Green' },
  { id: 'yellow', hex: '#f9a825', label: 'Yellow' },
  { id: 'erase', hex: '#ffffff', label: 'Eraser' },
]

const BRUSHES = [
  { id: 's', w: 2 },
  { id: 'm', w: 5 },
  { id: 'l', w: 12 },
]

function parsePaintFile(content) {
  if (!content || !content.startsWith(PAINT_MAGIC)) return null
  return content.slice(PAINT_MAGIC.length).trim()
}

function nextDoodleName(fs) {
  const kids = new Set(fs.listDir('/Pictures').map((k) => k.name))
  let i = 1
  let name = `doodle-${i}.wimg`
  while (kids.has(name)) {
    i += 1
    name = `doodle-${i}.wimg`
  }
  return name
}

/** Base name for exports (no extension), from open .wimg path or a default. */
function exportStem(payload) {
  if (payload?.filePath) {
    const stem = baseName(payload.filePath).replace(/\.wimg$/i, '')
    if (stem) return stem
  }
  return 'wondows-paint'
}

function downloadCanvasAs(canvas, mime, filename, onDone) {
  const quality = mime === 'image/jpeg' ? 0.92 : undefined
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        onDone('Could not export image (browser blocked or canvas error).')
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      onDone(`Downloaded ${filename}.`)
    },
    mime,
    quality,
  )
}

export default function PaintApp({ payload }) {
  const fs = useFs()
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const [color, setColor] = useState(COLORS[0].hex)
  const [brush, setBrush] = useState(BRUSHES[1].w)
  const [status, setStatus] = useState('Draw on the canvas.')

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const w = Math.max(200, wrap.clientWidth)
    const h = Math.max(180, Math.min(360, Math.round(w * 0.62)))
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
  }, [])

  const loadFromDataUrl = useCallback((dataUrl) => {
    const canvas = canvasRef.current
    if (!canvas || !dataUrl) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
      ctx.drawImage(img, 0, 0, w, h)
      setStatus('Image loaded.')
    }
    img.onerror = () => setStatus('Could not load image data from this file.')
    img.src = dataUrl
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fitCanvas()
      const path = payload?.filePath
      if (!path) {
        setStatus('Draw on the canvas.')
        return
      }
      const raw = fs.readFile(path)
      const url = parsePaintFile(raw ?? '')
      if (url) loadFromDataUrl(url)
      else setStatus('Open a .wimg from Pictures, or start fresh.')
    })
    return () => cancelAnimationFrame(id)
  }, [payload?.filePath, fs, fitCanvas, loadFromDataUrl])

  const line = (x1, y1, x2, y2) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = brush
    if (color === '#ffffff') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = brush + 2
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
    }
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.restore()
  }

  const pos = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const r = canvas.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    return { x, y }
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pos(e)
    if (!p) return
    drawing.current = true
    last.current = p
  }

  const onPointerMove = (e) => {
    if (!drawing.current) return
    const p = pos(e)
    if (!p || !last.current) return
    line(last.current.x, last.current.y, p.x, p.y)
    last.current = p
  }

  const onPointerUp = (e) => {
    drawing.current = false
    last.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const clearAll = () => {
    fitCanvas()
    setStatus('Canvas cleared.')
  }

  const saveToPictures = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const body = PAINT_MAGIC + dataUrl
    const name = nextDoodleName(fs)
    const full = childPath('/Pictures', name)
    const r = fs.writeFile(full, body)
    if (r.ok) setStatus(`Saved to Pictures as ${name}.`)
    else window.alert(r.error ?? 'Save failed')
  }

  const downloadPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const stem = exportStem(payload)
    downloadCanvasAs(canvas, 'image/png', `${stem}.png`, setStatus)
  }

  const downloadJpeg = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const stem = exportStem(payload)
    downloadCanvasAs(canvas, 'image/jpeg', `${stem}.jpg`, setStatus)
  }

  return (
    <div className="os-app-paint">
      <p className="os-paint-blurb">
        Saves drawings as <strong>.wimg</strong> in Pictures, or download as{' '}
        <strong>PNG</strong> / <strong>JPEG</strong> to your device.
      </p>
      <div className="os-paint-toolbar">
        <div className="os-paint-colors">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`os-paint-swatch${color === c.hex ? ' on' : ''}`}
              style={{ background: c.hex, borderColor: '#111' }}
              title={c.label}
              onClick={() => setColor(c.hex)}
              aria-label={c.label}
            />
          ))}
        </div>
        <div className="os-paint-brushes">
          {BRUSHES.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`os-paint-brush${brush === b.w ? ' on' : ''}`}
              onClick={() => setBrush(b.w)}
            >
              {b.id.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="os-paint-actions">
          <button type="button" className="os-paint-btn" onClick={clearAll}>
            Clear canvas
          </button>
          <button type="button" className="os-paint-btn" onClick={downloadPng} title="Lossless PNG">
            Download PNG
          </button>
          <button type="button" className="os-paint-btn" onClick={downloadJpeg} title="JPEG, ~92% quality">
            Download JPEG
          </button>
          <button type="button" className="os-paint-btn os-paint-btn--primary" onClick={saveToPictures}>
            Save to Pictures
          </button>
        </div>
      </div>
      <div ref={wrapRef} className="os-paint-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="os-paint-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <p className="os-paint-status">{status}</p>
    </div>
  )
}
