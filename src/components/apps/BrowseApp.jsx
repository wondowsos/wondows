import { useCallback, useMemo, useState } from 'react'

const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body { font-family: system-ui, sans-serif; margin: 0; padding: 28px;
  background: #f5f5f5; color: #1a1a1a; min-height: 100vh; box-sizing: border-box; }
h1 { font-size: 1.35rem; margin: 0 0 12px; font-weight: 600; }
p { margin: 0 0 14px; line-height: 1.55; font-size: 0.95rem; max-width: 42em; }
code { background: #e8e8e8; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
</style></head><body>
<h1>Browser</h1>
<p>Enter a full <code>https://</code> URL and choose Go. Some sites cannot be shown here because they block embedding in frames.</p>
</body></html>`

function normalizeUrl(input) {
  const t = input.trim()
  if (!t) return null
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withProto)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.href
  } catch {
    return null
  }
}

export default function BrowseApp({ payload }) {
  const initial = useMemo(() => {
    const u = payload?.url
    if (typeof u !== 'string') return ''
    return normalizeUrl(u) ?? ''
  }, [payload?.url])

  const [externalUrl, setExternalUrl] = useState(initial)
  const [address, setAddress] = useState(initial || 'https://example.com')

  const goHome = useCallback(() => {
    setExternalUrl('')
    setAddress('https://example.com')
  }, [])

  const navigate = useCallback(() => {
    const href = normalizeUrl(address)
    if (!href) {
      window.alert('Enter a valid http or https URL.')
      return
    }
    setExternalUrl(href)
  }, [address])

  return (
    <div className="os-app-browser">
      <div className="os-browser-toolbar">
        <button type="button" className="os-browser-home" onClick={goHome} title="Home page">
          Home
        </button>
        <input
          type="url"
          className="os-browser-url-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') navigate()
          }}
          placeholder="https://example.com"
          spellCheck={false}
          aria-label="Address"
        />
        <button type="button" className="os-browser-go" onClick={navigate}>
          Go
        </button>
      </div>
      {externalUrl ? (
        <iframe
          className="os-browser-frame"
          title="Browse"
          src={externalUrl}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        />
      ) : (
        <iframe
          className="os-browser-frame"
          title="Browse home"
          srcDoc={welcomeHtml}
          sandbox="allow-same-origin"
        />
      )}
    </div>
  )
}
