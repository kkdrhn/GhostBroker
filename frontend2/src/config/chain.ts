// Monad chain configuration — matches /api/models/schemas.py contract addresses
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    webSocket: { http: ['wss://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet.monadexplorer.com' },
  },
} as const;

export const MONADSCAN_TX = (hash: string) =>
  `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;

export const MONADSCAN_ADDR = (addr: string) =>
  `${monadTestnet.blockExplorers.default.url}/address/${addr}`;

// Contract addresses injected at build time via VITE_ env vars
// Run: cp .env.example .env.local and fill in deployed addresses
export const CONTRACT_ADDRESSES = {
  BROKER_AGENT:          import.meta.env.VITE_BROKER_AGENT_ADDRESS          ?? '0x0000000000000000000000000000000000000001',
  GHOST_TOKEN:           import.meta.env.VITE_GHOST_TOKEN_ADDRESS            ?? '0x0000000000000000000000000000000000000002',
  GHOST_MARKET:          import.meta.env.VITE_MARKET_ADDRESS                 ?? '0x0000000000000000000000000000000000000003',
  MATCH_ENGINE:          import.meta.env.VITE_MATCH_ENGINE_ADDRESS           ?? '0x0000000000000000000000000000000000000004',
  STAKE_VAULT:           import.meta.env.VITE_STAKE_VAULT_ADDRESS            ?? '0x0000000000000000000000000000000000000005',
  REPUTATION_ENGINE:     import.meta.env.VITE_REPUTATION_ENGINE_ADDRESS      ?? '0x0000000000000000000000000000000000000006',
  PARTNERSHIP_COVENANT:  import.meta.env.VITE_PARTNERSHIP_COVENANT_ADDRESS   ?? '0x0000000000000000000000000000000000000007',
} as const;
