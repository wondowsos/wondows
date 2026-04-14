import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { getPumpdevApiBase } from './pumpdevConfig'
import {
  collectSendTransactionErrorText,
  InsufficientSolError,
  sendRawTransactionWithSolCheck,
} from './solanaSend'

function keypairFromPrivateKeyB58(b58) {
  const trimmed = String(b58 ?? '').trim()
  if (!trimmed) throw new Error('Missing wallet private key')
  let secret
  try {
    secret = bs58.decode(trimmed)
  } catch {
    throw new Error('Private key is not valid base58')
  }
  if (secret.length === 64) return Keypair.fromSecretKey(secret)
  if (secret.length === 32) return Keypair.fromSeed(secret)
  throw new Error('Private key must be 32-byte seed or 64-byte secret (base58)')
}

/**
 * POST to a PumpDev endpoint that returns a serialized VersionedTransaction (octet-stream).
 * @see https://pumpdev.io/claim-fees — /api/claim-account
 * @see https://pumpdev.io/claim-cashback — /api/claim-cashback
 * @see https://pumpdev.io/transfer — /api/transfer
 * @see https://pumpdev.io/trade-api — /api/trade-local
 */
async function fetchPumpdevUnsignedTx(path, { apiKey, body }) {
  const base = getPumpdevApiBase()
  const key = apiKey?.trim()
  const q = key ? `?api-key=${encodeURIComponent(key)}` : ''
  const url = `${base}${path}${q}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const buf = new Uint8Array(await res.arrayBuffer())
  const text = new TextDecoder().decode(buf)

  if (!res.ok) {
    let msg = text.slice(0, 500) || `Request failed (${res.status})`
    try {
      const j = JSON.parse(text)
      if (typeof j.error === 'string') msg = j.error
    } catch {
      /* keep msg */
    }
    throw new Error(msg)
  }

  try {
    return VersionedTransaction.deserialize(buf)
  } catch {
    try {
      const j = JSON.parse(text)
      if (typeof j.error === 'string') throw new Error(j.error)
    } catch (e) {
      if (e instanceof Error && e.message && !e.message.includes('JSON')) throw e
    }
    throw new Error('The service did not return a valid serialized transaction.')
  }
}

async function signAndSendVersionedTx(tx, privateKeyB58, rpcUrl) {
  const signer = keypairFromPrivateKeyB58(privateKeyB58)
  tx.sign([signer])
  const connection = new Connection(rpcUrl, 'confirmed')
  return sendRawTransactionWithSolCheck(
    connection,
    tx.serialize(),
    { skipPreflight: false, maxRetries: 3 },
  )
}

/**
 * ClaimCashback + uninitialized `user_volume_accumulator` (Anchor 3012 / 0xbc4) means nothing to claim.
 */
function isCashbackVolumeAccountNotReadyLog(text) {
  const s = String(text ?? '')
  if (/user_volume_accumulator/i.test(s) && /AccountNotInitialized/i.test(s)) return true
  if (
    /ClaimCashback/i.test(s) &&
    (/AccountNotInitialized/i.test(s) || /\b3012\b/.test(s) || /0xbc4\b/i.test(s))
  ) {
    return true
  }
  return false
}

/**
 * Claim pump.fun creator fees (client-side sign + your RPC).
 * Optional `mint` for graduated tokens with fee sharing.
 */
export async function claimPumpdevCreatorFees({
  publicKey,
  mint,
  apiKey,
  privateKeyB58,
  rpcUrl,
}) {
  const body = { publicKey }
  const m = mint?.trim()
  if (m) body.mint = m
  const tx = await fetchPumpdevUnsignedTx('/api/claim-account', { apiKey, body })
  return signAndSendVersionedTx(tx, privateKeyB58, rpcUrl)
}

/** Claim PumpDev trading cashback (client-side sign + your RPC). */
export async function claimPumpdevCashback({
  publicKey,
  apiKey,
  privateKeyB58,
  rpcUrl,
}) {
  const tx = await fetchPumpdevUnsignedTx('/api/claim-cashback', {
    apiKey,
    body: { publicKey },
  })
  try {
    return await signAndSendVersionedTx(tx, privateKeyB58, rpcUrl)
  } catch (err) {
    if (err instanceof InsufficientSolError) throw err
    const connection = new Connection(rpcUrl, 'confirmed')
    const blob = await collectSendTransactionErrorText(err, connection)
    if (isCashbackVolumeAccountNotReadyLog(blob)) {
      throw new Error('No cashback available for this wallet yet.')
    }
    throw err
  }
}

/**
 * Transfer SOL via PumpDev (unsigned tx from API, sign locally, send on your RPC).
 * @see https://pumpdev.io/transfer
 */
export async function transferPumpdevSol({
  publicKey,
  recipient,
  amount,
  apiKey,
  privateKeyB58,
  rpcUrl,
}) {
  const to = recipient?.trim()
  if (!to) throw new Error('Recipient address is required')
  const amt = Number(amount)
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error('Amount must be a positive number')
  }
  const tx = await fetchPumpdevUnsignedTx('/api/transfer', {
    apiKey,
    body: { publicKey, recipient: to, amount: amt },
  })
  return signAndSendVersionedTx(tx, privateKeyB58, rpcUrl)
}

/**
 * Buy or sell a pump.fun token via PumpDev (unsigned tx from API, sign locally, send on your RPC).
 * @see https://pumpdev.io/trade-api — POST /api/trade-local
 */
export async function tradePumpdevLocal({
  publicKey,
  action,
  mint,
  amount,
  denominatedInSol,
  apiKey,
  privateKeyB58,
  rpcUrl,
}) {
  const m = mint?.trim()
  if (!m) throw new Error('Token mint is required')
  const act = String(action ?? '').toLowerCase()
  if (act !== 'buy' && act !== 'sell') {
    throw new Error('Action must be buy or sell')
  }

  let amountOut
  if (typeof amount === 'string') {
    const t = amount.trim()
    if (!t) throw new Error('Amount is required')
    if (t.endsWith('%')) {
      const n = Number(t.slice(0, -1).replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0 || n > 100) {
        throw new Error('Percentage must be between 0 and 100')
      }
      amountOut = `${n}%`
    } else if (/^\d+$/.test(t)) {
      if (BigInt(t) <= 0n) throw new Error('Amount must be positive')
      amountOut = t
    } else {
      throw new Error('Invalid amount (use e.g. 100%, or raw token units as digits only)')
    }
  } else {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new Error('Amount must be a positive number')
    }
    amountOut = amt
  }

  const body = {
    publicKey,
    action: act,
    mint: m,
    amount: amountOut,
    denominatedInSol: denominatedInSol ? 'true' : 'false',
  }
  const tx = await fetchPumpdevUnsignedTx('/api/trade-local', { apiKey, body })
  return signAndSendVersionedTx(tx, privateKeyB58, rpcUrl)
}
