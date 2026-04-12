/** Solana HTTP RPC (e.g. Helius). Set `VITE_SOLANA_RPC_URL` in `.env`. */
export function getSolanaRpcUrl() {
  const u = import.meta.env.VITE_SOLANA_RPC_URL?.trim()
  if (u) return u
  return 'https://api.mainnet-beta.solana.com'
}

export function formatRpcHost(url) {
  try {
    return new URL(url).hostname
  } catch {
    return 'RPC'
  }
}
