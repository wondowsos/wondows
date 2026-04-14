import { SendTransactionError } from '@solana/web3.js'

const INSUFFICIENT_RE = /insufficient lamports/i

/** Thrown when simulation/send fails for low SOL; UI can toast this message. */
export class InsufficientSolError extends Error {
  constructor() {
    super('Not enough SOL in this wallet.')
    this.name = 'InsufficientSolError'
  }
}

function joinLogs(logs) {
  if (!logs) return ''
  if (Array.isArray(logs)) return logs.join('\n')
  return ''
}

async function gatherTxErrorText(err, connection) {
  const parts = [
    err?.message,
    err?.transactionMessage,
    joinLogs(err?.transactionLogs),
  ]
  const pre = parts.filter(Boolean).join('\n')
  if (INSUFFICIENT_RE.test(pre)) return pre
  if (err instanceof SendTransactionError) {
    try {
      const logs = await err.getLogs(connection)
      parts.push(joinLogs(logs))
    } catch {
      /* signature may be missing on simulate-only errors */
    }
  }
  return parts.filter(Boolean).join('\n')
}

/**
 * sendRawTransaction with skipPreflight: false; maps “Insufficient lamports” to InsufficientSolError.
 */
export async function sendRawTransactionWithSolCheck(
  connection,
  rawTransaction,
  options,
) {
  try {
    return await connection.sendRawTransaction(rawTransaction, options)
  } catch (err) {
    const blob = await gatherTxErrorText(err, connection)
    if (INSUFFICIENT_RE.test(blob)) {
      throw new InsufficientSolError()
    }
    throw err
  }
}
