import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../../constants'
import { createPumpfunTokenLocal } from '../../lib/pumpfunCreate'
import { getSolanaRpcUrl } from '../../lib/solanaRpc'

const LEGACY_WALLET_KEY = 'wondows-pump-wallet'

function loadWalletBundle() {
  if (typeof localStorage === 'undefined') return null
  try {
    let raw = localStorage.getItem(STORAGE_KEYS.walletBundle)
    if (!raw) raw = localStorage.getItem(LEGACY_WALLET_KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (
      typeof o?.privateKey === 'string' &&
      typeof o?.walletPublicKey === 'string' &&
      o.privateKey.trim() &&
      o.walletPublicKey.trim()
    ) {
      return { privateKey: o.privateKey, walletPublicKey: o.walletPublicKey }
    }
  } catch {
    /* ignore */
  }
  return null
}

const defaultTradeUrl =
  import.meta.env.VITE_TRADE_LOCAL_URL?.trim() || '/api/trade-local'

export default function PumpFunApp() {
  const [bundle, setBundle] = useState(null)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [description, setDescription] = useState('')
  const [twitter, setTwitter] = useState('')
  const [telegram, setTelegram] = useState('')
  const [website, setWebsite] = useState('')
  const [amountSol, setAmountSol] = useState(0.01)
  const [slippage, setSlippage] = useState(10)
  const [priorityFee, setPriorityFee] = useState(0.00001)
  const [imageFile, setImageFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null)

  const refreshWallet = useCallback(() => {
    setBundle(loadWalletBundle())
  }, [])

  useEffect(() => {
    refreshWallet()
  }, [refreshWallet])

  const onPickImage = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    setImageFile(f ?? null)
    setErr('')
  }

  const onCreate = async () => {
    setErr('')
    setResult(null)
    if (!bundle?.privateKey) {
      setErr('Create or import a wallet in the Wallet app first.')
      return
    }
    if (!name.trim() || !symbol.trim()) {
      setErr('Name and symbol are required.')
      return
    }
    if (!imageFile) {
      setErr('Choose a token image file.')
      return
    }

    setBusy(true)
    try {
      const out = await createPumpfunTokenLocal({
        imageFile,
        name,
        symbol,
        description,
        twitter,
        telegram,
        website,
        privateKeyB58: bundle.privateKey,
        rpcUrl: getSolanaRpcUrl(),
        tradeLocalUrl: defaultTradeUrl,
        amountSol,
        slippage,
        priorityFee,
      })
      setResult(out)
    } catch (e) {
      setErr(e?.message ?? 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="os-app-pumpfun">
      {err ? (
        <p className="os-pumpfun-error" role="alert">
          {err}
        </p>
      ) : null}

      {result ? (
        <div className="os-pumpfun-success">
          <p className="os-pumpfun-success-title">Submitted</p>
          <p>
            <strong>Mint</strong>{' '}
            <code className="os-pumpfun-code-inline">{result.mint}</code>
          </p>
          <p>
            <a
              href={`https://solscan.io/tx/${result.signature}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction on Solscan
            </a>
          </p>
        </div>
      ) : null}

      <section className="os-pumpfun-section">
        <h3 className="os-pumpfun-h3">Signer wallet</h3>
        {bundle ? (
          <p className="os-pumpfun-wallet-ok">
            Using <code className="os-pumpfun-code-inline">{bundle.walletPublicKey}</code>
            <button
              type="button"
              className="os-pumpfun-btn os-pumpfun-btn--sm"
              onClick={refreshWallet}
            >
              Refresh
            </button>
          </p>
        ) : (
          <p className="os-pumpfun-wallet-miss">
            No wallet in this browser. Open the Wallet app and create or import one.
          </p>
        )}
      </section>

      <section className="os-pumpfun-section">
        <h3 className="os-pumpfun-h3">Token</h3>
        <label className="os-pumpfun-label">
          Name
          <input
            className="os-pumpfun-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Token name"
          />
        </label>
        <label className="os-pumpfun-label">
          Symbol
          <input
            className="os-pumpfun-input"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. ABC"
          />
        </label>
        <label className="os-pumpfun-label">
          Description
          <textarea
            className="os-pumpfun-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="os-pumpfun-label">
          Twitter URL (optional)
          <input
            className="os-pumpfun-input"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
          />
        </label>
        <label className="os-pumpfun-label">
          Telegram URL (optional)
          <input
            className="os-pumpfun-input"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
          />
        </label>
        <label className="os-pumpfun-label">
          Website (optional)
          <input
            className="os-pumpfun-input"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
        <label className="os-pumpfun-label">
          Token image
          <input type="file" accept="image/*" onChange={onPickImage} />
        </label>
        {imageFile ? (
          <p className="os-pumpfun-file-name">{imageFile.name}</p>
        ) : null}
      </section>

      <section className="os-pumpfun-section">
        <h3 className="os-pumpfun-h3">Trade params</h3>
        <label className="os-pumpfun-label">
          Dev buy (SOL)
          <input
            type="number"
            className="os-pumpfun-input"
            min={0}
            step="any"
            value={amountSol}
            onChange={(e) => setAmountSol(Number(e.target.value))}
          />
        </label>
        <label className="os-pumpfun-label">
          Slippage (%)
          <input
            type="number"
            className="os-pumpfun-input"
            min={0}
            value={slippage}
            onChange={(e) => setSlippage(Number(e.target.value))}
          />
        </label>
        <label className="os-pumpfun-label">
          Priority fee (SOL)
          <input
            type="number"
            className="os-pumpfun-input"
            min={0}
            step="any"
            value={priorityFee}
            onChange={(e) => setPriorityFee(Number(e.target.value))}
          />
        </label>
      </section>

      <div className="os-pumpfun-actions">
        <button
          type="button"
          className="os-pumpfun-btn os-pumpfun-btn--primary"
          onClick={onCreate}
          disabled={busy}
        >
          {busy ? 'Creating…' : 'Create token'}
        </button>
      </div>
    </div>
  )
}
