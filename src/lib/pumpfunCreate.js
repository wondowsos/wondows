import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'

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

export async function createPumpfunTokenLocal({
  imageFile,
  name,
  symbol,
  description,
  twitter,
  telegram,
  website,
  privateKeyB58,
  rpcUrl,
  tradeLocalUrl,
  amountSol,
  slippage,
  priorityFee,
}) {
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

  const mintKeypair = Keypair.generate()
  const signerKeypair = keypairFromWalletPrivateKey(privateKeyB58)

  const body = {
    publicKey: signerKeypair.publicKey.toBase58(),
    action: 'create',
    tokenMetadata: {
      name: meta.name,
      symbol: meta.symbol,
      uri: metadataUri,
    },
    mint: mintKeypair.publicKey.toBase58(),
    denominatedInSol: 'true',
    amount: amountSol,
    slippage,
    priorityFee,
    pool: 'pump',
  }

  const res = await fetch(tradeLocalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(t?.slice(0, 500) || `Create-tx API failed (${res.status})`)
  }

  const buf = new Uint8Array(await res.arrayBuffer())
  const tx = VersionedTransaction.deserialize(buf)
  tx.sign([mintKeypair, signerKeypair])

  const connection = new Connection(rpcUrl, 'confirmed')
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  })

  return {
    signature: sig,
    mint: mintKeypair.publicKey.toBase58(),
    metadataUri,
  }
}
