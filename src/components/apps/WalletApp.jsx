import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { STORAGE_KEYS } from '../../constants'
import { copyTextToClipboard } from '../../lib/clipboard'
import {
  claimPumpdevCashback,
  claimPumpdevCreatorFees,
  transferPumpdevSol,
} from '../../lib/pumpdevClaims'
import { PublicKey } from '@solana/web3.js'
import { createWalletViaHttp } from '../../lib/walletApi'
import { showOsToast } from '../../lib/osToast'
import { InsufficientSolError } from '../../lib/solanaSend'
import { formatRpcHost, getSolanaRpcUrl } from '../../lib/solanaRpc'

const KEY = STORAGE_KEYS.walletBundle
const LEGACY_WALLET_KEY = 'wondows-pump-wallet'

const WALLET_TABS = [
  { id: 'balances', label: 'Balances' },
  { id: 'transfer', label: 'Send SOL' },
  { id: 'fees', label: 'Creator fees' },
  { id: 'cashback', label: 'Cashback' },
]

function WalletTokenIcon({ imageUrl, fallbackChar }) {
  const [showImg, setShowImg] = useState(!!imageUrl)
  const ch = (fallbackChar || '?').slice(0, 1).toUpperCase()
  if (!showImg || !imageUrl) {
    return (
      <span className="os-wallet-tok-icon-placeholder" aria-hidden>
        {ch}
      </span>
    )
  }
  return (
    <img
      className="os-wallet-tok-icon-img"
      src={imageUrl}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setShowImg(false)}
    />
  )
}

function normalizeImported(raw) {
  if (!raw || typeof raw !== 'object') return null
  const { walletPublicKey, privateKey, apiKey } = raw
  const ak = typeof apiKey === 'string' ? apiKey.trim() : ''
  if (
    typeof walletPublicKey !== 'string' ||
    typeof privateKey !== 'string' ||
    !walletPublicKey.trim() ||
    !privateKey.trim()
  ) {
    return null
  }
  return { walletPublicKey, privateKey, apiKey: ak }
}

function loadStored() {
  if (typeof localStorage === 'undefined') return null
  try {
    let raw = localStorage.getItem(KEY)
    if (!raw) raw = localStorage.getItem(LEGACY_WALLET_KEY)
    if (!raw) return null
    return normalizeImported(JSON.parse(raw))
  } catch {
    return null
  }
}

function saveStored(data) {
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...data, savedAt: Date.now() }),
  )
  localStorage.removeItem(LEGACY_WALLET_KEY)
}

export default function WalletApp() {
  const [bundle, setBundle] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showPrivate, setShowPrivate] = useState(false)
  const [chain, setChain] = useState(null)
  const [chainLoading, setChainLoading] = useState(false)
  const [chainErr, setChainErr] = useState('')
  const [walletTab, setWalletTab] = useState('balances')
  const [feeMint, setFeeMint] = useState('')
  const [feesBusy, setFeesBusy] = useState(false)
  const [feesErr, setFeesErr] = useState('')
  const [feesSig, setFeesSig] = useState('')
  const [cashBusy, setCashBusy] = useState(false)
  const [cashErr, setCashErr] = useState('')
  const [cashSig, setCashSig] = useState('')
  const [xferTo, setXferTo] = useState('')
  const [xferAmt, setXferAmt] = useState('')
  const [xferBusy, setXferBusy] = useState(false)
  const [xferErr, setXferErr] = useState('')
  const [xferSig, setXferSig] = useState('')
  const fileRef = useRef(null)
  const tabBaseId = useId()

  const loadChain = useCallback(async () => {
    if (!bundle?.walletPublicKey) return
    setChainLoading(true)
    setChainErr('')
    try {
      const { fetchWalletPortfolio } = await import('../../lib/walletChainData')
      const data = await fetchWalletPortfolio(
        getSolanaRpcUrl(),
        bundle.walletPublicKey,
      )
      setChain(data)
    } catch (e) {
      setChain(null)
      setChainErr(e?.message ?? 'Could not load chain data.')
    } finally {
      setChainLoading(false)
    }
  }, [bundle?.walletPublicKey])

  useEffect(() => {
    setBundle(loadStored())
    setShowApiKey(false)
    setShowPrivate(false)
    setErr('')
    setChain(null)
    setChainErr('')
    setWalletTab('balances')
    setFeeMint('')
    setFeesErr('')
    setFeesSig('')
    setCashErr('')
    setCashSig('')
    setXferTo('')
    setXferAmt('')
    setXferErr('')
    setXferSig('')
  }, [])

  useEffect(() => {
    if (!bundle?.walletPublicKey) {
      setChain(null)
      setChainErr('')
      return
    }
    void loadChain()
  }, [bundle?.walletPublicKey, loadChain])

  const persist = useCallback((next) => {
    saveStored(next)
    setBundle(next)
  }, [])

  const fetchAndSaveNewWallet = async () => {
    if (
      bundle &&
      !window.confirm(
        'Replace the wallet on this device with a newly generated one? Export or import a backup first if you need it.',
      )
    ) {
      return
    }
    setErr('')
    setBusy(true)
    try {
      const w = await createWalletViaHttp()
      persist(w)
      setShowApiKey(false)
      setShowPrivate(false)
    } catch (e) {
      if (import.meta.env.DEV) console.warn('Wallet create failed', e)
      setErr('Could not create a wallet. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const applyImport = (parsed) => {
    if (!parsed) {
      setErr(
        'Invalid JSON. Expected walletPublicKey and privateKey (apiKey optional; Token Studio needs an API key).',
      )
      return
    }
    if (
      bundle &&
      !window.confirm(
        'Replace the current wallet with the imported file? This cannot be undone here.',
      )
    ) {
      return
    }
    setErr('')
    persist(parsed)
    setShowApiKey(false)
    setShowPrivate(false)
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const o = JSON.parse(text)
        applyImport(normalizeImported(o))
      } catch {
        setErr('Could not read that file as JSON.')
      }
    }
    reader.onerror = () => setErr('Failed to read file.')
    reader.readAsText(file, 'UTF-8')
  }

  const copyPk = async () => {
    if (!bundle?.privateKey) return
    const ok = await copyTextToClipboard(bundle.privateKey)
    if (!ok) window.alert('Could not copy to clipboard.')
  }

  const exportJson = () => {
    if (!bundle) return
    const blob = new Blob(
      [
        JSON.stringify(
          {
            walletPublicKey: bundle.walletPublicKey,
            privateKey: bundle.privateKey,
            apiKey: bundle.apiKey,
            exportedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `wondows-wallet-${bundle.walletPublicKey.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const mask = (s, show, head = 6) => {
    if (!s) return ''
    if (show) return s
    if (s.length <= head * 2) return '••••••••'
    return `${s.slice(0, head)}…${s.slice(-head)}`
  }

  const selectTab = (id) => {
    setWalletTab(id)
    setFeesErr('')
    setCashErr('')
    setXferErr('')
  }

  const onClaimCreatorFees = async () => {
    if (!bundle?.walletPublicKey || !bundle?.privateKey) return
    setFeesErr('')
    setFeesSig('')
    setFeesBusy(true)
    try {
      const sig = await claimPumpdevCreatorFees({
        publicKey: bundle.walletPublicKey,
        mint: feeMint,
        apiKey: bundle.apiKey,
        privateKeyB58: bundle.privateKey,
        rpcUrl: getSolanaRpcUrl(),
      })
      setFeesSig(sig)
    } catch (e) {
      setFeesSig('')
      if (e instanceof InsufficientSolError) {
        showOsToast(e.message)
      } else {
        setFeesErr(e?.message ?? 'Could not claim creator fees.')
      }
    } finally {
      setFeesBusy(false)
    }
  }

  const onClaimCashback = async () => {
    if (!bundle?.walletPublicKey || !bundle?.privateKey) return
    setCashErr('')
    setCashSig('')
    setCashBusy(true)
    try {
      const sig = await claimPumpdevCashback({
        publicKey: bundle.walletPublicKey,
        apiKey: bundle.apiKey,
        privateKeyB58: bundle.privateKey,
        rpcUrl: getSolanaRpcUrl(),
      })
      setCashSig(sig)
    } catch (e) {
      setCashSig('')
      if (e instanceof InsufficientSolError) {
        showOsToast(e.message)
      } else {
        setCashErr(e?.message ?? 'Could not claim cashback.')
      }
    } finally {
      setCashBusy(false)
    }
  }

  const onTransferSol = async () => {
    if (!bundle?.walletPublicKey || !bundle?.privateKey) return
    setXferErr('')
    setXferSig('')
    const to = xferTo.trim()
    if (!to) {
      setXferErr('Enter a recipient address.')
      return
    }
    try {
      new PublicKey(to)
    } catch {
      setXferErr('Recipient is not a valid Solana address.')
      return
    }
    const amt = Number(String(xferAmt).replace(',', '.'))
    if (!Number.isFinite(amt) || amt <= 0) {
      setXferErr('Enter a positive SOL amount.')
      return
    }
    setXferBusy(true)
    try {
      const sig = await transferPumpdevSol({
        publicKey: bundle.walletPublicKey,
        recipient: to,
        amount: amt,
        apiKey: bundle.apiKey,
        privateKeyB58: bundle.privateKey,
        rpcUrl: getSolanaRpcUrl(),
      })
      setXferSig(sig)
      setXferAmt('')
      void loadChain()
    } catch (e) {
      setXferSig('')
      if (e instanceof InsufficientSolError) {
        showOsToast(e.message)
      } else {
        setXferErr(e?.message ?? 'Transfer failed.')
      }
    } finally {
      setXferBusy(false)
    }
  }

  return (
    <div className="os-app-wallet">
      {!bundle || walletTab === 'balances' ? (
        <p className="os-wallet-intro">
          Create a new <strong>Solana wallet and API key</strong>, or <strong>import a JSON file</strong>{' '}
          exported from this app. Stored in <strong>localStorage</strong>. Balances use the Solana RPC
          configured for this deployment.
        </p>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="os-wallet-file-input"
        aria-hidden
        tabIndex={-1}
        onChange={onFileChange}
      />

      {err ? (
        <p className="os-wallet-error" role="alert">
          {err}
        </p>
      ) : null}

      {!bundle ? (
        <div className="os-wallet-actions">
          <button
            type="button"
            className="os-wallet-primary"
            onClick={fetchAndSaveNewWallet}
            disabled={busy}
          >
            {busy ? 'Creating…' : 'Create new wallet & API key'}
          </button>
          <button
            type="button"
            className="os-wallet-secondary"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            Import from JSON file
          </button>
        </div>
      ) : (
        <>
          <section className="os-wallet-pub-top" aria-label="Public key">
            <span className="os-wallet-pub-top-label">Public key</span>
            <div className="os-wallet-pub-top-row">
              <code className="os-wallet-code os-wallet-pub-top-code">
                {bundle.walletPublicKey}
              </code>
              <button
                type="button"
                className="os-wallet-mini"
                onClick={() =>
                  void copyTextToClipboard(bundle.walletPublicKey)
                }
              >
                Copy
              </button>
            </div>
          </section>

          <div className="os-wallet-tabs" role="tablist" aria-label="Wallet sections">
            {WALLET_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${tabBaseId}-${t.id}`}
                className="os-wallet-tab"
                aria-selected={walletTab === t.id}
                tabIndex={walletTab === t.id ? 0 : -1}
                onClick={() => selectTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`${tabBaseId}-panel-${walletTab}`}
            aria-labelledby={`${tabBaseId}-${walletTab}`}
            className="os-wallet-tab-panel"
          >
            {walletTab === 'balances' ? (
              <>
                {!bundle.apiKey?.trim() ? (
                  <p className="os-wallet-msg" role="status">
                    No API key in this bundle — Token Studio needs an{' '}
                    <code className="os-wallet-intro-code">apiKey</code>. Import JSON that includes it or
                    create a new wallet.
                  </p>
                ) : null}
                <section className="os-wallet-chain" aria-label="Balances">
                  <div className="os-wallet-chain-head">
                    <button
                      type="button"
                      className="os-wallet-mini"
                      title={formatRpcHost(getSolanaRpcUrl())}
                      onClick={() => void loadChain()}
                      disabled={chainLoading}
                    >
                      {chainLoading ? '…' : 'Refresh'}
                    </button>
                  </div>
                  {chainErr ? (
                    <p className="os-wallet-chain-err" role="alert">
                      {chainErr}
                    </p>
                  ) : null}
                  {chainLoading && !chain ? (
                    <p className="os-wallet-chain-status">Loading balances…</p>
                  ) : null}
                  {chain ? (
                    <>
                      <p className="os-wallet-sol-line">
                        <strong>SOL balance</strong>{' '}
                        <span className="os-wallet-sol-amt">
                          {chain.sol.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 9,
                          })}{' '}
                          SOL
                        </span>
                      </p>
                      <p className="os-wallet-tokens-title">Tokens (SPL / Token-2022)</p>
                      {chain.tokens.length === 0 ? (
                        <p className="os-wallet-tokens-empty">No tokens in this wallet.</p>
                      ) : (
                        <div className="os-wallet-tokens-wrap">
                          <table className="os-wallet-tokens">
                            <thead>
                              <tr>
                                <th>Token</th>
                                <th>Balance</th>
                                <th aria-label="Actions" />
                              </tr>
                            </thead>
                            <tbody>
                              {chain.tokens.map((t) => (
                                <tr key={t.mint}>
                                  <td>
                                    <div className="os-wallet-tok-cell">
                                      <div className="os-wallet-tok-icon-wrap">
                                        <WalletTokenIcon
                                          imageUrl={t.imageUrl}
                                          fallbackChar={t.symbol || t.label}
                                        />
                                      </div>
                                      <div className="os-wallet-tok-meta">
                                        {t.name ? (
                                          <>
                                            <span className="os-wallet-tok-name">{t.name}</span>
                                            {t.symbol && t.symbol !== t.name ? (
                                              <span className="os-wallet-tok-symbol">
                                                {t.symbol}
                                              </span>
                                            ) : null}
                                          </>
                                        ) : (
                                          <span className="os-wallet-tok-name">
                                            {t.symbol || t.label}
                                          </span>
                                        )}
                                        <span className="os-wallet-tok-prog">{t.program}</span>
                                        <code className="os-wallet-tok-mint" title={t.mint}>
                                          {t.mint.slice(0, 6)}…{t.mint.slice(-6)}
                                        </code>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="os-wallet-tok-bal">
                                    {t.uiAmountString}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="os-wallet-mini"
                                      title="Copy mint address"
                                      onClick={() =>
                                        void copyTextToClipboard(t.mint)
                                      }
                                    >
                                      Copy
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : null}
                </section>

                <dl className="os-wallet-fields">
                  <dt>API key</dt>
                  <dd>
                    <code className="os-wallet-code">
                      {mask(bundle.apiKey, showApiKey)}
                    </code>
                    <button
                      type="button"
                      className="os-wallet-mini"
                      onClick={() => setShowApiKey((v) => !v)}
                    >
                      {showApiKey ? 'Hide' : 'Reveal'}
                    </button>
                    {showApiKey ? (
                      <button
                        type="button"
                        className="os-wallet-mini"
                        onClick={() => void copyTextToClipboard(bundle.apiKey)}
                      >
                        Copy
                      </button>
                    ) : null}
                  </dd>
                  <dt>Private key</dt>
                  <dd>
                    <code className="os-wallet-code">
                      {mask(bundle.privateKey, showPrivate)}
                    </code>
                    <button
                      type="button"
                      className="os-wallet-mini"
                      onClick={() => setShowPrivate((v) => !v)}
                    >
                      {showPrivate ? 'Hide' : 'Reveal'}
                    </button>
                    {showPrivate ? (
                      <button
                        type="button"
                        className="os-wallet-mini"
                        onClick={copyPk}
                      >
                        Copy
                      </button>
                    ) : null}
                  </dd>
                </dl>
                <div className="os-wallet-actions">
                  <button type="button" className="os-wallet-primary" onClick={exportJson}>
                    Export JSON (keys)
                  </button>
                </div>
              </>
            ) : null}

            {walletTab === 'transfer' ? (
              <>
                <div className="os-wallet-claim-field">
                  <label className="os-wallet-claim-label" htmlFor={`${tabBaseId}-xfer-to`}>
                    Recipient
                  </label>
                  <input
                    id={`${tabBaseId}-xfer-to`}
                    className="os-wallet-claim-input"
                    value={xferTo}
                    onChange={(e) => setXferTo(e.target.value)}
                    placeholder="Solana address (base58)"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="os-wallet-claim-field">
                  <label className="os-wallet-claim-label" htmlFor={`${tabBaseId}-xfer-amt`}>
                    Amount (SOL)
                  </label>
                  <input
                    id={`${tabBaseId}-xfer-amt`}
                    className="os-wallet-claim-input"
                    type="text"
                    inputMode="decimal"
                    value={xferAmt}
                    onChange={(e) => setXferAmt(e.target.value)}
                    placeholder="e.g. 0.1"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {xferErr ? (
                  <p className="os-wallet-error" role="alert">
                    {xferErr}
                  </p>
                ) : null}
                {xferSig ? (
                  <p className="os-wallet-claim-success" role="status">
                    Submitted —{' '}
                    <a
                      href={`https://solscan.io/tx/${xferSig}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      view on Solscan
                    </a>
                  </p>
                ) : null}
                <div className="os-wallet-actions">
                  <button
                    type="button"
                    className="os-wallet-primary"
                    onClick={() => void onTransferSol()}
                    disabled={xferBusy}
                  >
                    {xferBusy ? 'Working…' : 'Send SOL'}
                  </button>
                </div>
              </>
            ) : null}

            {walletTab === 'fees' ? (
              <>
                <p className="os-wallet-claim-blurb">
                  Collect pump.fun creator royalties in a single on-chain transaction.
                </p>
                <p className="os-wallet-claim-hint">
                  The service returns an unsigned transaction; this app signs with your saved private
                  key and broadcasts it using your configured Solana RPC.
                </p>
                <div className="os-wallet-claim-field">
                  <label className="os-wallet-claim-label" htmlFor={`${tabBaseId}-fee-mint`}>
                    Mint (optional)
                  </label>
                  <input
                    id={`${tabBaseId}-fee-mint`}
                    className="os-wallet-claim-input"
                    value={feeMint}
                    onChange={(e) => setFeeMint(e.target.value)}
                    placeholder="Token mint for graduated / fee-sharing cases"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="os-wallet-claim-hint">
                    Leave empty to claim account-wide fees. If you are asked for a mint (for example
                    graduated tokens with fee sharing), paste it here and try again.
                  </p>
                </div>
                {feesErr ? (
                  <p className="os-wallet-error" role="alert">
                    {feesErr}
                  </p>
                ) : null}
                {feesSig ? (
                  <p className="os-wallet-claim-success" role="status">
                    Submitted —{' '}
                    <a
                      href={`https://solscan.io/tx/${feesSig}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      view on Solscan
                    </a>
                  </p>
                ) : null}
                <div className="os-wallet-actions">
                  <button
                    type="button"
                    className="os-wallet-primary"
                    onClick={() => void onClaimCreatorFees()}
                    disabled={feesBusy}
                  >
                    {feesBusy ? 'Working…' : 'Claim creator fees'}
                  </button>
                </div>
              </>
            ) : null}

            {walletTab === 'cashback' ? (
              <>
                <p className="os-wallet-claim-blurb">
                  Claim eligible trading cashback.
                </p>
                <p className="os-wallet-claim-hint">
                  Same flow as creator fees: you receive an unsigned transaction, sign locally, and
                  broadcast on your RPC.
                </p>
                {cashErr ? (
                  <p className="os-wallet-error" role="alert">
                    {cashErr}
                  </p>
                ) : null}
                {cashSig ? (
                  <p className="os-wallet-claim-success" role="status">
                    Submitted —{' '}
                    <a
                      href={`https://solscan.io/tx/${cashSig}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      view on Solscan
                    </a>
                  </p>
                ) : null}
                <div className="os-wallet-actions">
                  <button
                    type="button"
                    className="os-wallet-primary"
                    onClick={() => void onClaimCashback()}
                    disabled={cashBusy}
                  >
                    {cashBusy ? 'Working…' : 'Claim cashback'}
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {walletTab === 'balances' ? (
            <div className="os-wallet-actions os-wallet-actions-footer">
              <button
                type="button"
                className="os-wallet-secondary"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                Import JSON (replace)
              </button>
              <button
                type="button"
                className="os-wallet-secondary"
                onClick={fetchAndSaveNewWallet}
                disabled={busy}
              >
                New wallet (API)
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
