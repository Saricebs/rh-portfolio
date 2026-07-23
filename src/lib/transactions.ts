import { TokenInfo } from './chain'

const API = 'https://robinhoodchain.blockscout.com/api'

export interface Tx {
  hash: string
  timestamp: number
  from: string
  to: string
  value: string
  tokenSymbol: string
  tokenDecimal: string
  method: 'Swap' | 'Transfer' | 'LP' | 'Bridge' | 'Send' | 'Receive' | 'Contract'
  direction: 'in' | 'out' | 'self'
  status: 'ok' | 'error'
  gasUsed: string
  gasPrice: string
}

// Method signatures from Blockscout input
function guessMethod(input: string, to: string, from: string, isContract: boolean, value: string): Tx['method'] {
  if (!input || input === '0x') return value !== '0' ? 'Transfer' : 'Contract'
  const sig = input.slice(0, 10)
  const swapSigs = ['0x38ed1739', '0x8803dbee', '0x7ff36ab5', '0x18cbafe5', '0x4a25d94a', '0x5c11d779', '0x414bf389',
    '0x3593564c', '0x6af479b2']
  const lpSigs = ['0xf305d719', '0x4c4133cc', '0xe8e33700', '0x0d4c9759', '0x02751cec', '0x441a3e70', '0xf1251e87',
    '0x2195995c', '0x88316456', '0x5b0d5984']
  const bridgeSigs = ['0x4f25e3d0', '0x56591d86', '0x49281e6c', '0x870749e0', '0x8b9e4f93', '0xa2c2ad6e']

  if (swapSigs.includes(sig)) return 'Swap'
  if (lpSigs.includes(sig)) return 'LP'
  if (bridgeSigs.includes(sig)) return 'Bridge'
  if (value === '0' && isContract) return 'Contract'
  return 'Transfer'
}

function guessDirection(from: string, to: string, address: string): Tx['direction'] {
  const a = address.toLowerCase()
  const f = from.toLowerCase()
  const t = to.toLowerCase()
  if (f === a && t === a) return 'self'
  if (t === a) return 'in'
  return 'out'
}

interface BlockscoutTx {
  hash: string
  timeStamp: string
  from: string
  to: string
  value: string
  tokenSymbol: string
  tokenDecimal: string
  tokenName: string
  methodId: string
  functionName: string
  isError: string
  gasUsed: string
  gasPrice: string
  contractAddress: string
  input: string
}

export async function fetchTransactions(address: string): Promise<Tx[]> {
  const url = `${API}?module=account&action=txlist&address=${address}&sort=desc&limit=30`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Blockscout ${res.status}`)
  const json = await res.json()

  if (json.message !== 'OK' || !Array.isArray(json.result)) {
    return []
  }

  const items = json.result as BlockscoutTx[]

  // Build a set of known contract addresses for method guessing context
  const contractSet = new Set<string>()
  for (const tx of items) {
    if (tx.contractAddress && tx.contractAddress !== '0x0000000000000000000000000000000000000000') {
      contractSet.add(tx.contractAddress.toLowerCase())
    }
  }

  return items.map(tx => {
    const isContract = contractSet.has(tx.to?.toLowerCase() || '') || !!tx.contractAddress
    const direction = guessDirection(tx.from, tx.to, address)
    const method = guessMethod(tx.input || '0x', tx.to, tx.from, isContract, tx.value)
    return {
      hash: tx.hash,
      timestamp: parseInt(tx.timeStamp) * 1000,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      tokenSymbol: tx.tokenSymbol || (method === 'Transfer' && direction === 'in' ? 'ETH' : ''),
      tokenDecimal: tx.tokenDecimal || '18',
      method,
      direction,
      status: tx.isError === '0' ? 'ok' : 'error',
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice,
    }
  })
}

export function filterTxs(
  txs: Tx[],
  typeFilter: string | null,
  tokenFilter: string | null,
): Tx[] {
  let filtered = txs
  if (typeFilter && typeFilter !== 'All') {
    filtered = filtered.filter(tx => tx.method === typeFilter)
  }
  if (tokenFilter && tokenFilter !== 'All') {
    // Match on the token symbol from the transaction or heuristic from value
    filtered = filtered.filter(tx => {
      const sym = tx.tokenSymbol?.toLowerCase() || ''
      return sym.includes(tokenFilter.toLowerCase())
    })
  }
  return filtered
}
