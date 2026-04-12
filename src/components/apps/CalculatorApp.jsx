import { useCallback, useState } from 'react'

function parseNum(s) {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function CalcKey({ label, className, onClick }) {
  return (
    <button
      type="button"
      className={className ?? 'os-calc-key'}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export default function CalculatorApp() {
  const [display, setDisplay] = useState('0')
  const [acc, setAcc] = useState(null)
  const [op, setOp] = useState(null)
  const [fresh, setFresh] = useState(true)

  const applyOp = useCallback((a, b, operator) => {
    switch (operator) {
      case '+':
        return a + b
      case '-':
        return a - b
      case '*':
        return a * b
      case '/':
        return b === 0 ? NaN : a / b
      default:
        return b
    }
  }, [])

  const digit = (d) => {
    setDisplay((cur) => {
      if (fresh) {
        setFresh(false)
        return d
      }
      if (cur === '0' && d !== '.') return d
      return cur + d
    })
  }

  const setOperator = (next) => {
    const v = parseNum(display)
    if (v === null) return
    if (acc !== null && op && !fresh) {
      const r = applyOp(acc, v, op)
      setDisplay(String(Number.isFinite(r) ? Math.round(r * 1e9) / 1e9 : r))
      setAcc(Number.isFinite(r) ? r : null)
    } else {
      setAcc(v)
    }
    setOp(next)
    setFresh(true)
  }

  const equals = () => {
    const v = parseNum(display)
    if (v === null || acc === null || !op) return
    const r = applyOp(acc, v, op)
    setDisplay(String(Number.isFinite(r) ? Math.round(r * 1e9) / 1e9 : r))
    setAcc(null)
    setOp(null)
    setFresh(true)
  }

  const clear = () => {
    setDisplay('0')
    setAcc(null)
    setOp(null)
    setFresh(true)
  }

  return (
    <div className="os-app-calc">
      <div className="os-calc-screen" aria-live="polite">
        {display}
        {op ? <span className="os-calc-hint"> {op}</span> : null}
      </div>
      <div className="os-calc-grid">
        <CalcKey
          label="C"
          className="os-calc-key os-calc-wide"
          onClick={clear}
        />
        <CalcKey label="/" onClick={() => setOperator('/')} />
        <CalcKey label="7" onClick={() => digit('7')} />
        <CalcKey label="8" onClick={() => digit('8')} />
        <CalcKey label="9" onClick={() => digit('9')} />
        <CalcKey label="*" onClick={() => setOperator('*')} />
        <CalcKey label="4" onClick={() => digit('4')} />
        <CalcKey label="5" onClick={() => digit('5')} />
        <CalcKey label="6" onClick={() => digit('6')} />
        <CalcKey label="-" onClick={() => setOperator('-')} />
        <CalcKey label="1" onClick={() => digit('1')} />
        <CalcKey label="2" onClick={() => digit('2')} />
        <CalcKey label="3" onClick={() => digit('3')} />
        <CalcKey label="+" onClick={() => setOperator('+')} />
        <CalcKey
          label="0"
          className="os-calc-key os-calc-zero"
          onClick={() => digit('0')}
        />
        <CalcKey label="." onClick={() => digit('.')} />
        <CalcKey
          label="="
          className="os-calc-key os-calc-eq"
          onClick={equals}
        />
      </div>
    </div>
  )
}
