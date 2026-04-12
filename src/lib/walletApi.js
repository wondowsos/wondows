/**
 * Create a Solana wallet + API key bundle via a remote HTTP GET endpoint.
 */
export async function createWalletViaHttp() {
  const url =
    import.meta.env.VITE_WALLET_CREATE_URL?.trim() ||
    '/api/wallet/create-wallet'

  const res = await fetch(url, { method: 'GET' })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(text?.slice(0, 200) || `Request failed (${res.status})`)
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Server did not return JSON.')
  }
  const { apiKey, walletPublicKey, privateKey } = data
  if (
    typeof apiKey !== 'string' ||
    typeof walletPublicKey !== 'string' ||
    typeof privateKey !== 'string'
  ) {
    throw new Error('Unexpected response from wallet API')
  }

  return { apiKey, walletPublicKey, privateKey }
}
