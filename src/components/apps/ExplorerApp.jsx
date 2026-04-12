import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Folder, Trash2 } from 'lucide-react'
import { useFs } from '../../context/FsContext'
import { useOs } from '../../context/OsContext'
import { childPath, parentPath } from '../../fs/wondowsFs'
import { copyTextToClipboard } from '../../lib/clipboard'
import { getFileOpenWindowSpec } from '../../lib/fileAssociations'

export default function ExplorerApp({ payload }) {
  const startPath = payload?.path ?? '/'
  const [path, setPath] = useState(startPath)
  const [selectedPath, setSelectedPath] = useState(null)
  const [menu, setMenu] = useState(null)
  const listRef = useRef(null)
  const { openWindow } = useOs()
  const fs = useFs()

  const items = useMemo(() => {
    const rows = fs.listDir(path)
    return [...rows].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [fs, path])

  const goToPath = useCallback((p) => {
    setPath(p)
    setSelectedPath(null)
  }, [])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [menu])

  const selectedItem = useMemo(
    () => items.find((it) => it.path === selectedPath) ?? null,
    [items, selectedPath],
  )

  const goUp = useCallback(() => {
    const p = parentPath(path)
    if (p !== null) goToPath(p)
  }, [path, goToPath])

  const openItem = useCallback(
    (it) => {
      if (it.type === 'dir') {
        goToPath(it.path)
        return
      }
      if (it.type !== 'file') return
      const spec = getFileOpenWindowSpec(it.path, it.name)
      openWindow(spec.type, spec.payload ?? null)
    },
    [openWindow, goToPath],
  )

  const openSelected = useCallback(() => {
    if (selectedItem) openItem(selectedItem)
  }, [selectedItem, openItem])

  const onNewFolder = () => {
    const raw = window.prompt('Folder name')
    if (!raw) return
    const r = fs.mkdir(path, raw)
    if (!r.ok) window.alert(r.error)
  }

  const onNewFile = () => {
    const raw = window.prompt('New text file name')
    if (!raw) return
    const name = raw.includes('.') ? raw : `${raw}.txt`
    const full = childPath(path, name)
    const r = fs.writeFile(full, '')
    if (!r.ok) window.alert(r.error)
  }

  const onDeletePath = (itemPath, name) => {
    if (!window.confirm(`Move "${name}" to Trash?`)) return
    const r = fs.trash(itemPath)
    if (!r.ok) window.alert(r.error)
    else if (selectedPath === itemPath) setSelectedPath(null)
  }

  const onRenamePath = (itemPath, currentName) => {
    const raw = window.prompt('New name', currentName)
    if (!raw || raw === currentName) return
    const clean = raw.replace(/[/\\]/g, '').trim()
    if (!clean) return
    const r = fs.rename(itemPath, clean)
    if (!r.ok) window.alert(r.error)
    else if (selectedPath === itemPath) {
      const par = parentPath(itemPath)
      setSelectedPath(childPath(par, clean))
    }
  }

  const renameSelected = () => {
    if (!selectedItem) return
    onRenamePath(selectedItem.path, selectedItem.name)
  }

  const copyPath = async (p) => {
    const ok = await copyTextToClipboard(p)
    if (!ok) window.alert('Clipboard not available.')
  }

  const copyContents = async (p) => {
    if (fs.getKind(p) !== 'file') return
    const text = fs.readFile(p)
    const ok = await copyTextToClipboard(text ?? '')
    if (!ok) window.alert('Clipboard not available.')
  }

  const crumbs = []
  let acc = ''
  const parts = path === '/' ? [] : path.split('/').filter(Boolean)
  crumbs.push({ label: 'This PC', p: '/' })
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : `/${part}`
    crumbs.push({ label: part, p: acc })
  }

  const onListKeyDown = (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedItem && !e.repeat) {
        e.preventDefault()
        onDeletePath(selectedItem.path, selectedItem.name)
      }
      return
    }
    if (e.key === 'F2') {
      if (selectedItem) {
        e.preventDefault()
        onRenamePath(selectedItem.path, selectedItem.name)
      }
    }
    if (e.key === 'Enter' && selectedItem) {
      e.preventDefault()
      openItem(selectedItem)
    }
  }

  return (
    <div className="os-app-explorer">
      <div className="os-ex-toolbar">
        <button type="button" className="os-ex-btn" onClick={goUp} disabled={path === '/'}>
          Up
        </button>
        <button type="button" className="os-ex-btn" onClick={openSelected} disabled={!selectedItem}>
          Open
        </button>
        <button type="button" className="os-ex-btn" onClick={renameSelected} disabled={!selectedItem}>
          Rename
        </button>
        <button type="button" className="os-ex-btn" onClick={onNewFolder}>
          New folder
        </button>
        <button type="button" className="os-ex-btn" onClick={onNewFile}>
          New text file
        </button>
      </div>
      <div className="os-ex-crumbs" aria-label="Path">
        {crumbs.map((c, i) => (
          <span key={c.p}>
            {i > 0 ? <span className="os-ex-crumb-sep"> » </span> : null}
            <button
              type="button"
              className="os-ex-crumb"
              onClick={() => goToPath(c.p)}
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>
      <div
        ref={listRef}
        className="os-ex-list"
        role="list"
        tabIndex={0}
        aria-label="Files"
        onKeyDown={onListKeyDown}
      >
        {items.map((it) => (
          <div key={it.path} className="os-ex-row" role="listitem">
            <button
              type="button"
              className={`os-ex-open${selectedPath === it.path ? ' is-selected' : ''}`}
              onClick={() => setSelectedPath(it.path)}
              onDoubleClick={() => openItem(it)}
              onContextMenu={(e) => {
                e.preventDefault()
                setSelectedPath(it.path)
                setMenu({ x: e.clientX, y: e.clientY, item: it })
              }}
            >
              <span className="os-ex-icon">
                {it.type === 'dir' ? (
                  it.path === '/Trash' ? (
                    <Trash2 size={22} strokeWidth={2} />
                  ) : (
                    <Folder size={22} strokeWidth={2} />
                  )
                ) : (
                  <FileText size={22} strokeWidth={2} />
                )}
              </span>
              <span className="os-ex-name">{it.name}</span>
            </button>
            <button
              type="button"
              className="os-ex-del"
              title="Move to Trash"
              onClick={(e) => {
                e.stopPropagation()
                onDeletePath(it.path, it.name)
              }}
            >
              Trash
            </button>
          </div>
        ))}
        {items.length === 0 ? (
          <div className="os-ex-empty">This folder is empty.</div>
        ) : null}
      </div>

      {menu ? (
        <ul
          className="os-ctx-menu"
          style={{
            position: 'fixed',
            left: Math.min(menu.x, typeof window !== 'undefined' ? window.innerWidth - 220 : menu.x),
            top: Math.min(menu.y, typeof window !== 'undefined' ? window.innerHeight - 240 : menu.y),
            zIndex: 20000,
          }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                openItem(menu.item)
                setMenu(null)
              }}
            >
              Open
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                onRenamePath(menu.item.path, menu.item.name)
                setMenu(null)
              }}
            >
              Rename…
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item"
              onClick={() => {
                void copyPath(menu.item.path)
                setMenu(null)
              }}
            >
              Copy path
            </button>
          </li>
          {menu.item.type === 'file' ? (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="os-ctx-item"
                onClick={() => {
                  void copyContents(menu.item.path)
                  setMenu(null)
                }}
              >
                Copy contents
              </button>
            </li>
          ) : null}
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="os-ctx-item os-ctx-danger"
              onClick={() => {
                onDeletePath(menu.item.path, menu.item.name)
                setMenu(null)
              }}
            >
              Move to Trash
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}
