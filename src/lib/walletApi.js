import { getPumpdevApiBase } from './pumpdevConfig'

/**
 * Create a Solana wallet + PumpDev API key via POST /api/wallet/create.
 * @see https://pumpdev.io/welcome
 */
export async function createWalletViaHttp() {
  const base = getPumpdevApiBase()
  const url = `${base}/api/wallet/create`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = text?.slice(0, 300) || `Request failed (${res.status})`
    try {
      const j = JSON.parse(text)
      if (j?.error) msg = String(j.error)
    } catch {
      /* keep msg */
    }
    throw new Error(msg)
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Server did not return JSON.')
  }

  const { apiKey, publicKey, privateKey } = data
  if (
    typeof apiKey !== 'string' ||
    typeof publicKey !== 'string' ||
    typeof privateKey !== 'string'
  ) {
    throw new Error('Unexpected response from wallet service')
  }

  return { apiKey, walletPublicKey: publicKey, privateKey }
}
