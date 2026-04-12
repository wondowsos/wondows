import { useEffect, useRef, useState } from 'react'
import { useFs } from '../../context/FsContext'
import { useOs } from '../../context/OsContext'
import { baseName, childPath, parentPath } from '../../fs/wondowsFs'

const scratch =
  'Notepad\r\n\r\n• Ctrl+S — Save (choose a name on first save)\r\n• Ctrl+Shift+S — Save as…\r\n• Ctrl+F — Find next\r\n\r\nText files saved under Desktop appear as icons on the desktop. Documents are stored in this browser only.'

function sanitizeNoteFileName(raw) {
  const s = raw.replace(/[/\\]/g, '').trim()
  if (!s) return null
  const withExt = /\.[a-z0-9]+$/i.test(s) ? s : `${s}.txt`
  if (withExt.includes('/') || withExt.includes('\\')) return null
  return withExt
}

export default function NotepadApp({ payload, windowId }) {
  const fs = useFs()
  const { updateWindow } = useOs()
  const taRef = useRef(null)
  const [text, setText] = useState(scratch)
  const [filePath, setFilePath] = useState(payload?.filePath ?? null)
  const [dirty, setDirty] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')

  useEffect(() => {
    const p = payload?.filePath
    if (!p) {
      setText(scratch)
      setFilePath(null)
      setDirty(false)
      return
    }
    setFilePath(p)
    setText(fs.readFile(p) ?? '')
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when OS assigns a different path
  }, [payload?.filePath])

  const syncTitle = (path, isDirty) => {
    if (!windowId) return
    const star = isDirty ? '*' : ''
    if (!path) {
      updateWindow(windowId, { title: `${star}Untitled - Notepad` })
      return
    }
    const name = path.split('/').pop()
    updateWindow(windowId, { title: `${star}${name} - Notepad` })
  }

  useEffect(() => {
    syncTitle(filePath, dirty)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- title sync only
  }, [filePath, dirty, windowId])

  const saveToPath = (target) => {
    const r = fs.writeFile(target, text)
    if (!r.ok) {
      window.alert(`Save failed: ${r.error}`)
      return false
    }
    setFilePath(target)
    setDirty(false)
    return true
  }

  const onSave = () => {
    if (filePath) {
      saveToPath(filePath)
      return
    }
    const name = window.prompt(
      'Name this note (saved under Documents)\r\n\r\nExtension .txt is added if you omit one.',
      '',
    )
    if (name === null) return
    const clean = sanitizeNoteFileName(name)
    if (!clean) {
      window.alert('Pick a file name (no slashes or empty names).')
      return
    }
    saveToPath(childPath('/Documents', clean))
  }

  const onSaveAs = () => {
    const dir = filePath ? parentPath(filePath) : '/Documents'
    const safeDir = dir && dir !== '/' ? dir : '/Documents'
    const suggest = filePath ? baseName(filePath) : ''
    const name = window.prompt(
      `Save as (folder: ${safeDir})`,
      suggest,
    )
    if (name === null) return
    const clean = sanitizeNoteFileName(name)
    if (!clean) {
      window.alert('Pick a file name (no slashes or empty names).')
      return
    }
    saveToPath(childPath(safeDir, clean))
  }

  const onChange = (v) => {
    setText(v)
    setDirty(true)
  }

  const findNext = () => {
    const ta = taRef.current
    if (!ta || !findQuery) return
    const v = ta.value
    const q = findQuery
    let from = ta.selectionEnd
    let i = v.indexOf(q, from)
    if (i === -1 && from > 0) i = v.indexOf(q)
    if (i === -1) return
    ta.focus()
    ta.setSelectionRange(i, i + q.length)
  }

  const onEditorKeyDown = (e) => {
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key === 's') {
      e.preventDefault()
      if (e.shiftKey) onSaveAs()
      else onSave()
      return
    }
    if (mod && e.key === 'f') {
      e.preventDefault()
      setFindOpen(true)
      requestAnimationFrame(() => findNext())
    }
  }

  return (
    <div
      className="os-app-notepad"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div className="os-np-bar">
        <button type="button" className="os-np-btn" onClick={onSave}>
          Save
        </button>
        <button type="button" className="os-np-btn" onClick={onSaveAs}>
          Save as…
        </button>
        <button
          type="button"
          className="os-np-btn"
          onClick={() => {
            setFilePath(null)
            setText(scratch)
            setDirty(true)
          }}
        >
          New
        </button>
        <button
          type="button"
          className="os-np-btn"
          onClick={() => setFindOpen((o) => !o)}
        >
          Find
        </button>
        <span className="os-np-meta">{filePath ?? 'Not saved'}</span>
      </div>
      {findOpen ? (
        <div className="os-np-find" data-os-no-global-shortcuts>
          <input
            type="search"
            className="os-np-find-input"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') findNext()
            }}
            placeholder="Find…"
            aria-label="Find"
          />
          <button type="button" className="os-np-btn" onClick={findNext}>
            Next
          </button>
        </div>
      ) : null}
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onEditorKeyDown}
        spellCheck={false}
        aria-label="Document"
      />
    </div>
  )
}
