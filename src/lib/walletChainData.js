import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

const TOKEN_PROGRAM = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
)
const TOKEN_2022 = new PublicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
)

const WSOL_MINT = 'So11111111111111111111111111111111111111112'

const KNOWN_MINTS = {
  [WSOL_MINT]: 'Wrapped SOL',
}

const JUP_TOKEN_SEARCH =
  'https://lite-api.jup.ag/tokens/v2/search?query='

/**
 * @param {string} mint
 * @returns {Promise<{ name: string, symbol: string, imageUrl: string } | null>}
 */
async function fetchJupiterTokenMeta(mint) {
  try {
    const res = await fetch(`${JUP_TOKEN_SEARCH}${encodeURIComponent(mint)}`)
    if (!res.ok) return null
    const arr = await res.json()
    if (!Array.isArray(arr)) return null
    const hit = arr.find((t) => t?.id === mint)
    const name = typeof hit?.name === 'string' ? hit.name.trim() : ''
    const symbol = typeof hit?.symbol === 'string' ? hit.symbol.trim() : ''
    if (!name && !symbol) return null
    const imageUrl =
      typeof hit.icon === 'string' && hit.icon.startsWith('http') ? hit.icon : null
    return { name, symbol, imageUrl }
  } catch {
    return null
  }
}

async function mapInBatches(items, batchSize, mapper) {
  const out = []
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize)
    const part = await Promise.all(slice.map(mapper))
    out.push(...part)
  }
  return out
}

function formatRawTokenAmount(raw, decimals) {
  if (decimals === 0) return raw.toString()
  const v = raw < 0n ? -raw : raw
  const base = 10n ** BigInt(decimals)
  const whole = v / base
  const frac = v % base
  const fracStr = frac
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')
  if (!fracStr) return (raw < 0n ? '-' : '') + whole.toString()
  return (raw < 0n ? '-' : '') + `${whole.toString()}.${fracStr}`
}

/**
 * @param {string} rpcUrl
 * @param {string} walletPublicKeyBase58
 */
export async function fetchWalletPortfolio(rpcUrl, walletPublicKeyBase58) {
  const connection = new Connection(rpcUrl, 'confirmed')
  const owner = new PublicKey(walletPublicKeyBase58)

  const lamports = await connection.getBalance(owner)
  const sol = lamports / LAMPORTS_PER_SOL

  /** @type {Map<string, { raw: bigint, decimals: number, program: string }>} */
  const byMint = new Map()

  for (const programId of [TOKEN_PROGRAM, TOKEN_2022]) {
    const programLabel = programId.equals(TOKEN_2022) ? 'Token-2022' : 'SPL'
    const raw = await connection.getParsedTokenAccountsByOwner(owner, {
      programId,
    })
    const accounts = Array.isArray(raw) ? raw : raw?.value ?? []

    for (const { account } of accounts) {
      const parsed = account.data?.parsed
      if (parsed?.type !== 'account') continue
      const info = parsed.info
      const ta = info?.tokenAmount
      if (!ta) continue

      let raw
      try {
        raw = BigInt(ta.amount ?? '0')
      } catch {
        continue
      }
      if (raw === 0n) continue

      const mint = String(info.mint ?? '')
      if (!mint) continue

      const decimals = Number(ta.decimals ?? 0)
      const prev = byMint.get(mint)
      if (prev) {
        prev.raw += raw
      } else {
        byMint.set(mint, { raw, decimals, program: programLabel })
      }
    }
  }

  const sorted = [...byMint.entries()]
    .map(([mint, { raw, decimals, program }]) => ({
      mint,
      fallbackLabel:
        KNOWN_MINTS[mint] ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`,
      uiAmountString: formatRawTokenAmount(raw, decimals),
      decimals,
      program,
      raw,
    }))
    .sort((a, b) => (a.raw < b.raw ? 1 : a.raw > b.raw ? -1 : 0))

  const tokens = await mapInBatches(sorted, 6, async (row) => {
    const meta = await fetchJupiterTokenMeta(row.mint)
    const name = meta?.name?.trim() || null
    const symbol = meta?.symbol?.trim() || null
    const imageUrl = meta?.imageUrl || null
    const label = symbol || name || row.fallbackLabel
    return {
      mint: row.mint,
      label,
      name,
      symbol,
      imageUrl,
      uiAmountString: row.uiAmountString,
      decimals: row.decimals,
      program: row.program,
    }
  })

  return { sol, lamports, tokens }
}
