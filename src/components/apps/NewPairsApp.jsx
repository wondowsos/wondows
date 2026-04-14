import { useEffect, useState } from 'react'
import { copyTextToClipboard } from '../../lib/clipboard'
import { getPumpdevWsUrl } from '../../lib/pumpdevConfig'

const MAX_ROWS = 120
const SUBSCRIBE = JSON.stringify({ method: 'subscribeNewToken' })
const UNSUBSCRIBE = JSON.stringify({ method: 'unsubscribeNewToken' })

function parseMessage(raw) {
  try {
    const j = JSON.parse(raw)
    const t = j.type
    if (t === 'connected' || t === 'subscribed' || t === 'unsubscribed') {
      return { kind: 'ctrl', payload: j }
    }
    if (t === 'error') {
      return { kind: 'err', message: String(j.message ?? 'WebSocket error') }
    }
    if (j.mint && (j.name != null || j.symbol != null)) {
      return { kind: 'token', data: j }
    }
    return { kind: 'unknown' }
  } catch {
    return { kind: 'unknown' }
  }
}

/** Metadata JSON at `uri` usually has `image` (HTTPS, or ipfs://). */
function normalizeImageUrl(raw) {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  if (t.startsWith('ipfs://')) {
    const path = t.slice('ipfs://'.length).replace(/^ipfs\//, '')
    return path ? `https://ipfs.io/ipfs/${path}` : null
  }
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return null
}

async function fetchMetadataImageUrl(uri, signal) {
  const u = typeof uri === 'string' ? uri.trim() : ''
  if (!u.startsWith('http')) return null
  const res = await fetch(u, { signal, mode: 'cors' })
  if (!res.ok) return null
  const j = await res.json()
  return normalizeImageUrl(j?.image)
}

function RowThumbLoaded({ imageUrl, label }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="os-newpairs-thumb-placeholder" aria-hidden>
        {(label || '?').slice(0, 1).toUpperCase()}
      </span>
    )
  }
  return (
    <img
      className="os-newpairs-thumb-img"
      src={imageUrl}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}

function RowThumb({ imageUrl, label }) {
  if (!imageUrl) {
    return (
      <span className="os-newpairs-thumb-placeholder" aria-hidden>
        {(label || '?').slice(0, 1).toUpperCase()}
      </span>
    )
  }
  return <RowThumbLoaded key={imageUrl} imageUrl={imageUrl} label={label} />
}

export default function NewPairsApp() {
  const [status, setStatus] = useState('Connecting…')
  const [rows, setRows] = useState([])
  const [lastErr, setLastErr] = useState('')

  useEffect(() => {
    const ac = new AbortController()
    const { signal } = ac
    let ws
    let cancelled = false

    const pushTokenRow = (d) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `r-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const row = {
        id,
        signature: d.signature,
        mint: d.mint,
        name: d.name ?? '',
        symbol: d.symbol ?? '',
        solAmount: d.solAmount,
        marketCapSol: d.marketCapSol,
        traderPublicKey: d.traderPublicKey,
        uri: d.uri,
        imageUrl: null,
      }
      setRows((prev) => {
        const next = [row, ...prev]
        return next.slice(0, MAX_ROWS)
      })

      const uri = d.uri
      if (typeof uri === 'string' && uri.trim().startsWith('http')) {
        void (async () => {
          try {
            const imageUrl = await fetchMetadataImageUrl(uri, signal)
            if (!imageUrl || signal.aborted) return
            setRows((prev) =>
              prev.map((r) => (r.id === id ? { ...r, imageUrl } : r)),
            )
          } catch (e) {
            if (e?.name === 'AbortError') return
          }
        })()
      }
    }

    const url = getPumpdevWsUrl()
    try {
      ws = new WebSocket(url)
    } catch (e) {
      queueMicrotask(() => {
        setStatus('Could not open WebSocket')
        setLastErr(e?.message ?? 'Invalid WebSocket URL')
      })
      return () => ac.abort()
    }

    ws.onopen = () => {
      if (cancelled) {
        ws.close()
        return
      }
      setStatus('Live — new tokens')
      setLastErr('')
      try {
        ws.send(SUBSCRIBE)
      } catch (e) {
        setLastErr(e?.message ?? 'Subscribe failed')
      }
    }

    ws.onmessage = (ev) => {
      if (cancelled) return
      const msg = parseMessage(ev.data)
      if (msg.kind === 'err') {
        setLastErr(msg.message)
        return
      }
      if (msg.kind === 'ctrl') {
        return
      }
      if (msg.kind === 'token') {
        pushTokenRow(msg.data)
      }
    }

    ws.onerror = () => {
      if (!cancelled) setLastErr('WebSocket error (network or server).')
    }

    ws.onclose = () => {
      if (!cancelled) setStatus('Disconnected')
    }

    return () => {
      cancelled = true
      ac.abort()
      setStatus('Closing…')
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(UNSUBSCRIBE)
        }
      } catch {
        /* ignore */
      }
      try {
        ws.close()
      } catch {
        /* ignore */
      }
    }
  }, [])

  return (
    <div className="os-app-newpairs">
      <p className="os-newpairs-status" role="status">
        {status}
      </p>
      <p className="os-newpairs-hint">
        New tokens keep arriving while you are connected; the list shows the newest first and only
        keeps the last {MAX_ROWS} rows so memory stays bounded. Closing this window unsubscribes and
        closes the connection.
      </p>
      {lastErr ? (
        <p className="os-newpairs-error" role="alert">
          {lastErr}
        </p>
      ) : null}
      <div className="os-newpairs-table-wrap">
        <table className="os-newpairs-table">
          <thead>
            <tr>
              <th className="os-newpairs-th-thumb" aria-label="Image" />
              <th>Name</th>
              <th>Symbol</th>
              <th>SOL</th>
              <th>Mcap (SOL)</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="os-newpairs-empty">
                  Waiting for new tokens…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="os-newpairs-td-thumb">
                    <RowThumb imageUrl={r.imageUrl} label={r.symbol || r.name} />
                  </td>
                  <td className="os-newpairs-name" title={r.name}>
                    {r.name || '—'}
                  </td>
                  <td className="os-newpairs-symbol">{r.symbol || '—'}</td>
                  <td className="os-newpairs-num">
                    {r.solAmount != null && Number.isFinite(Number(r.solAmount))
                      ? Number(r.solAmount).toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })
                      : '—'}
                  </td>
                  <td className="os-newpairs-num">
                    {r.marketCapSol != null &&
                    Number.isFinite(Number(r.marketCapSol))
                      ? Number(r.marketCapSol).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : '—'}
                  </td>
                  <td className="os-newpairs-actions">
                    <button
                      type="button"
                      className="os-wallet-mini"
                      title="Copy mint"
                      onClick={() => void copyTextToClipboard(r.mint)}
                    >
                      Mint
                    </button>
                    {r.signature ? (
                      <a
                        className="os-newpairs-solscan"
                        href={`https://solscan.io/tx/${r.signature}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Tx
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
