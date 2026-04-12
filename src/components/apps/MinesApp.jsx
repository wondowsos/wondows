import { useCallback, useMemo, useState } from 'react'

const ROWS = 9
const COLS = 9
const MINE_COUNT = 10

function neighbors(r, c) {
  const out = []
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push([nr, nc])
    }
  }
  return out
}

function placeMines(safeR, safeC) {
  const set = new Set()
  const safe = new Set(
    [[safeR, safeC], ...neighbors(safeR, safeC)].map(([a, b]) => `${a},${b}`),
  )
  while (set.size < MINE_COUNT) {
    const r = Math.floor(Math.random() * ROWS)
    const c = Math.floor(Math.random() * COLS)
    const key = `${r},${c}`
    if (safe.has(key)) continue
    set.add(key)
  }
  return set
}

function countAdjacent(mines, r, c) {
  let n = 0
  for (const [nr, nc] of neighbors(r, c)) {
    if (mines.has(`${nr},${nc}`)) n += 1
  }
  return n
}

function emptyInit() {
  return {
    mines: null,
    revealed: Array.from({ length: ROWS }, () => Array(COLS).fill(false)),
    flagged: Array.from({ length: ROWS }, () => Array(COLS).fill(false)),
    adj: null,
    status: 'playing',
    first: true,
  }
}

export default function MinesApp() {
  const [game, setGame] = useState(emptyInit)

  const flatRevealed = useMemo(() => {
    let n = 0
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (game.revealed[r][c]) n += 1
      }
    }
    return n
  }, [game.revealed])

  const revealFlood = useCallback((mines, adj, r, c, rev) => {
    const stack = [[r, c]]
    const seen = new Set()
    while (stack.length) {
      const [cr, cc] = stack.pop()
      const k = `${cr},${cc}`
      if (seen.has(k)) continue
      seen.add(k)
      if (rev[cr][cc]) continue
      if (mines.has(k)) continue
      rev[cr][cc] = true
      if (adj[cr][cc] === 0) {
        for (const [nr, nc] of neighbors(cr, cc)) {
          if (!rev[nr][nc] && !mines.has(`${nr},${nc}`)) stack.push([nr, nc])
        }
      }
    }
  }, [])

  const onCellClick = (r, c) => {
    if (game.status !== 'playing') return
    if (game.flagged[r][c]) return

    setGame((g) => {
      let mines = g.mines
      let adj = g.adj
      let first = g.first

      if (first) {
        mines = placeMines(r, c)
        adj = Array.from({ length: ROWS }, (_, rr) =>
          Array.from({ length: COLS }, (_, cc) => countAdjacent(mines, rr, cc)),
        )
        first = false
      }

      const revealed = g.revealed.map((row) => [...row])
      const flagged = g.flagged.map((row) => [...row])

      if (mines.has(`${r},${c}`)) {
        for (let rr = 0; rr < ROWS; rr += 1) {
          for (let cc = 0; cc < COLS; cc += 1) {
            if (mines.has(`${rr},${cc}`)) revealed[rr][cc] = true
          }
        }
        return {
          mines,
          adj,
          revealed,
          flagged,
          status: 'lost',
          first: false,
        }
      }

      revealFlood(mines, adj, r, c, revealed)

      let won = true
      for (let rr = 0; rr < ROWS; rr += 1) {
        for (let cc = 0; cc < COLS; cc += 1) {
          if (!mines.has(`${rr},${cc}`) && !revealed[rr][cc]) won = false
        }
      }

      return {
        mines,
        adj,
        revealed,
        flagged,
        status: won ? 'won' : 'playing',
        first,
      }
    })
  }

  const onRightClick = (e, r, c) => {
    e.preventDefault()
    if (game.status !== 'playing') return
    if (game.revealed[r][c]) return
    setGame((g) => {
      const flagged = g.flagged.map((row) => [...row])
      flagged[r][c] = !flagged[r][c]
      return { ...g, flagged }
    })
  }

  const reset = () => setGame(emptyInit())

  const banner =
    game.status === 'won'
      ? 'You cleared the field.'
      : game.status === 'lost'
        ? 'Game over. Try again.'
        : `${MINE_COUNT} mines. Left-click to reveal, right-click to flag.`

  return (
    <div className="os-app-mines">
      <p className="os-mines-blurb">{banner}</p>
      <div className="os-mines-meta">
        <span>Revealed: {flatRevealed}</span>
        <button type="button" className="os-mines-reset" onClick={reset}>
          New game
        </button>
      </div>
      <div
        className="os-mines-grid"
        role="grid"
        aria-label="Minefield"
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = Math.floor(i / COLS)
          const c = i % COLS
          const rev = game.revealed[r][c]
          const fl = game.flagged[r][c]
          const isMine = game.mines?.has(`${r},${c}`)
          const n = game.adj?.[r]?.[c]

          let label = ''
          let cls = 'os-mines-cell'
          if (rev) {
            cls += ' revealed'
            if (isMine) {
              cls += ' mine'
              label = '💥'
            } else if (n > 0) {
              label = String(n)
              cls += ` n-${n}`
            }
          } else if (fl) {
            cls += ' flagged'
            label = '🚩'
          }

          return (
            <button
              key={`${r}-${c}`}
              type="button"
              className={cls}
              onClick={() => onCellClick(r, c)}
              onContextMenu={(e) => onRightClick(e, r, c)}
              aria-label={
                rev
                  ? isMine
                    ? 'Mine'
                    : n
                      ? `${n} adjacent`
                      : 'Empty'
                  : fl
                    ? 'Flagged'
                    : 'Hidden'
              }
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
