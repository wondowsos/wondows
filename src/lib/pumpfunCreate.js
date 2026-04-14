import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { getPumpdevApiBase } from './pumpdevConfig'
import { sendRawTransactionWithSolCheck } from './solanaSend'

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'

function pinataBase() {
  return import.meta.env.VITE_PINATA_UPLOAD_BASE?.trim() || '/api/pinata'
}

/** Upload via same-origin proxy; server adds Pinata Authorization. */
export async function pinataUploadFile(file) {
  const formData = new FormData()
  formData.append('network', 'public')
  formData.append('file', file)

  const res = await fetch(`${pinataBase()}/v3/files`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(t?.slice(0, 400) || `Pinata upload failed (${res.status})`)
  }

  const json = await res.json()
  const cid = json?.data?.cid
  if (!cid || typeof cid !== 'string') {
    throw new Error('Pinata response missing CID')
  }
  return cid
}

function keypairFromWalletPrivateKey(b58) {
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
 * Client-side token creation: PumpDev builds the tx; you sign with mint + creator and send.
 * @see https://pumpdev.io/welcome — POST /api/create
 */
export async function createPumpfunTokenLocal({
  imageFile,
  name,
  symbol,
  description,
  twitter,
  telegram,
  website,
  privateKeyB58,
  apiKey,
  pumpdevApiBase,
  rpcUrl,
  amountSol,
  slippage,
  priorityFee,
}) {
  const key = String(apiKey ?? '').trim()
  if (!key) throw new Error('API key is required — add one in the Wallet app.')

  const imageCid = await pinataUploadFile(imageFile)
  const imageUri = `${IPFS_GATEWAY}${imageCid}`

  const meta = {
    name: name.trim(),
    symbol: symbol.trim(),
    image: imageUri,
    description: (description ?? '').trim(),
    twitter: (twitter ?? '').trim(),
    telegram: (telegram ?? '').trim(),
    website: (website ?? '').trim(),
  }
  const metaFile = new File([JSON.stringify(meta)], 'metadata.json', {
    type: 'application/json',
  })
  const metaCid = await pinataUploadFile(metaFile)
  const metadataUri = `${IPFS_GATEWAY}${metaCid}`

  const signerKeypair = keypairFromWalletPrivateKey(privateKeyB58)

  const base = (pumpdevApiBase ?? getPumpdevApiBase()).replace(/\/$/, '')
  const url = `${base}/api/create?api-key=${encodeURIComponent(key)}`

  const body = {
    publicKey: signerKeypair.publicKey.toBase58(),
    name: meta.name,
    symbol: meta.symbol,
    uri: metadataUri,
    buyAmountSol: amountSol,
    slippage,
    priorityFee,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    if (!res.ok) {
      throw new Error(text?.slice(0, 500) || `Create API failed (${res.status})`)
    }
    throw new Error('Create API did not return JSON')
  }

  if (!res.ok) {
    throw new Error(json?.error || text?.slice(0, 500) || `Create API failed (${res.status})`)
  }

  const txB58 = json?.transaction
  const mintSecretB58 = json?.mintSecretKey
  const mintAddr = json?.mint
  if (typeof txB58 !== 'string' || typeof mintSecretB58 !== 'string') {
    throw new Error('Create API response missing transaction or mintSecretKey')
  }

  let mintSecret
  try {
    mintSecret = bs58.decode(mintSecretB58)
  } catch {
    throw new Error('Invalid mintSecretKey from API')
  }
  const mintKeypair =
    mintSecret.length === 64
      ? Keypair.fromSecretKey(mintSecret)
      : Keypair.fromSeed(mintSecret)

  let txBytes
  try {
    txBytes = bs58.decode(txB58)
  } catch {
    throw new Error('Invalid transaction encoding from API')
  }
  const tx = VersionedTransaction.deserialize(txBytes)
  tx.sign([mintKeypair, signerKeypair])

  const connection = new Connection(rpcUrl, 'confirmed')
  const sig = await sendRawTransactionWithSolCheck(
    connection,
    tx.serialize(),
    { skipPreflight: false, maxRetries: 3 },
  )

  return {
    signature: sig,
    mint: typeof mintAddr === 'string' ? mintAddr : mintKeypair.publicKey.toBase58(),
    metadataUri,
  }
}
