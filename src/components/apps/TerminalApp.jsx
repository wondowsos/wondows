import { useCallback, useRef, useState } from 'react'
import { useFs } from '../../context/FsContext'
import { useOs } from '../../context/OsContext'
import { WALLPAPERS, UI_THEMES } from '../../constants'
import { baseName, resolvePath } from '../../fs/wondowsFs'
import { getFileOpenWindowSpec } from '../../lib/fileAssociations'

const banner = `Wondows Terminal — type HELP for a list of commands.
Try: open Documents/readme.txt   theme dark   wallpaper grid
Use ↑ and ↓ to recall previous commands.

`

const START_ALIASES = {
  notepad: 'notepad',
  notes: 'notepad',
  np: 'notepad',
  browse: 'browse',
  web: 'browse',
  internet: 'browse',
  settings: 'settings',
  knobs: 'settings',
  terminal: 'terminal',
  hack: 'terminal',
  about: 'about',
  pc: 'explorer',
  explorer: 'explorer',
  files: 'explorer',
  folder: 'explorer',
  calc: 'calculator',
  calculator: 'calculator',
  math: 'calculator',
  wallet: 'wallet',
  w: 'wallet',
  sol: 'wallet',
  pump: 'wallet',
  pumpfun: 'pumpfun',
  mint: 'pumpfun',
  token: 'pumpfun',
  pill: 'pumpfun',
  meteora: 'meteora',
}

export default function TerminalApp() {
  const [lines, setLines] = useState([banner])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState('/')
  const [, setHistIndex] = useState(-1)
  const bottomRef = useRef(null)
  const historyRef = useRef([])
  const fs = useFs()
  const { openWindow, setTheme, setWallpaper } = useOs()

  const run = useCallback(
    (cmd) => {
      const trimmed = cmd.trim()
      if (!trimmed) {
        setLines((L) => [...L, ''])
        return
      }
      const lower = trimmed.toLowerCase()

      const push = (text) => {
        setLines((L) => [...L, `${cwd}> ${trimmed}`, text, ''])
      }

      if (lower === 'help') {
        push(
          'HELP CLS VER DATE ECHO\r\nDIR | LS   CD   TYPE | CAT   MD | MKDIR   DEL | RM\r\nOPEN <path>   START <app>   EMPTYTRASH\r\nTHEME <id>   WALLPAPER <id>\r\nApps: notepad browse explorer calc wallet pumpfun meteora settings terminal about',
        )
        return
      }
      if (lower === 'cls' || lower === 'clear') {
        setLines([])
        return
      }
      if (lower === 'ver') {
        push('Wondows Terminal')
        return
      }
      if (lower.startsWith('echo ')) {
        push(trimmed.slice(5))
        return
      }
      if (lower === 'date') {
        push(new Date().toString())
        return
      }
      if (lower === 'dir' || lower === 'ls') {
        const items = fs.listDir(cwd)
        const out =
          items.length === 0
            ? '(empty folder)'
            : items
                .map((it) => `${it.type === 'dir' ? '<DIR>' : '<FILE>'} ${it.name}`)
                .join('\r\n')
        push(out)
        return
      }
      if (lower.startsWith('cd ')) {
        const arg = trimmed.slice(3).trim()
        const target = resolvePath(cwd, arg || '.')
        if (fs.getKind(target) !== 'dir') {
          push(`Not a folder: ${target}`)
          return
        }
        setCwd(target)
        push(`Current directory: ${target}`)
        return
      }
      if (lower.startsWith('type ') || lower.startsWith('cat ')) {
        const arg = trimmed.slice(lower.startsWith('type ') ? 5 : 4).trim()
        const target = resolvePath(cwd, arg)
        if (fs.getKind(target) !== 'file') {
          push(`Not a file: ${target}`)
          return
        }
        push(fs.readFile(target) ?? '')
        return
      }
      if (lower.startsWith('md ') || lower.startsWith('mkdir ')) {
        const arg = trimmed.slice(lower.startsWith('md ') ? 3 : 6).trim()
        const r = fs.mkdir(cwd, arg)
        if (!r.ok) push(`mkdir: ${r.error}`)
        else push('Directory created.')
        return
      }
      if (lower.startsWith('del ') || lower.startsWith('rm ')) {
        const arg = trimmed.slice(lower.startsWith('del ') ? 4 : 3).trim()
        const target = resolvePath(cwd, arg)
        const r = fs.trash(target)
        if (!r.ok) push(`del: ${r.error}`)
        else push('Moved to Trash.')
        return
      }
      if (lower === 'emptytrash') {
        fs.purgeTrash()
        push('Trash emptied.')
        return
      }
      if (lower.startsWith('open ')) {
        const arg = trimmed.slice(5).trim()
        if (!arg) {
          push(
            'Usage: open <path>\r\nOpens a file with the same app as File Explorer, or a folder in Explorer.',
          )
          return
        }
        const target = resolvePath(cwd, arg)
        const kind = fs.getKind(target)
        if (kind === 'dir') {
          openWindow('explorer', { path: target })
          push(`Opened folder: ${target}`)
          return
        }
        if (kind === 'file') {
          const spec = getFileOpenWindowSpec(target, baseName(target))
          openWindow(spec.type, spec.payload ?? null)
          push(`Opened: ${target}`)
          return
        }
        push(`Not found: ${target}`)
        return
      }
      if (lower.startsWith('theme ')) {
        const id = trimmed.slice(6).trim()
        if (!id) {
          push(`Themes: ${UI_THEMES.join(', ')}`)
          return
        }
        if (!UI_THEMES.includes(id)) {
          push(`Unknown theme "${id}". Valid: ${UI_THEMES.join(', ')}`)
          return
        }
        setTheme(id)
        push(`Theme set: ${id}`)
        return
      }
      if (lower.startsWith('wallpaper ')) {
        const id = trimmed.slice(10).trim()
        if (!id) {
          push(`Wallpapers: ${WALLPAPERS.join(', ')}`)
          return
        }
        if (!WALLPAPERS.includes(id)) {
          push(`Unknown wallpaper "${id}". Valid: ${WALLPAPERS.join(', ')}`)
          return
        }
        setWallpaper(id)
        push(`Wallpaper set: ${id}`)
        return
      }
      if (lower.startsWith('start ')) {
        const arg = lower.slice(6).trim()
        const app = START_ALIASES[arg]
        if (!app) {
          push(`Unknown app "${arg}". Try: notepad, browse, explorer, wallet, pumpfun, meteora, calc, …`)
          return
        }
        if (app === 'explorer') openWindow('explorer', { path: cwd })
        else openWindow(app)
        push(`Started: ${app}`)
        return
      }

      push(`Unknown command "${trimmed}". Type HELP.`)
    },
    [cwd, fs, openWindow, setTheme, setWallpaper],
  )

  const onSubmit = (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (trimmed) {
      const h = historyRef.current
      const next = [...h.filter((x) => x !== trimmed), trimmed].slice(-80)
      historyRef.current = next
    }
    setHistIndex(-1)
    run(input)
    setInput('')
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end' })
    })
  }

  const onInputKeyDown = (e) => {
    const h = historyRef.current
    if (e.key === 'ArrowUp' && h.length > 0) {
      e.preventDefault()
      setHistIndex((i) => {
        const next = i < 0 ? h.length - 1 : Math.max(0, i - 1)
        setInput(h[next])
        return next
      })
      return
    }
    if (e.key === 'ArrowDown' && h.length > 0) {
      e.preventDefault()
      setHistIndex((i) => {
        if (i < 0) return -1
        const next = i >= h.length - 1 ? -1 : i + 1
        setInput(next < 0 ? '' : h[next])
        return next
      })
    }
  }

  return (
    <div className="os-app-terminal">
      {lines.map((line, i) => (
        <div key={i} className="os-terminal-line">
          {line}
        </div>
      ))}
      <form className="os-terminal-input-row" onSubmit={onSubmit}>
        <span style={{ color: '#76ff03' }}>{`${cwd}>`}</span>
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setHistIndex(-1)
          }}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          spellCheck={false}
          aria-label="Command"
        />
      </form>
      <div ref={bottomRef} />
    </div>
  )
}
