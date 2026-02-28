/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_BROKER_AGENT_ADDRESS: string;
  readonly VITE_GHOST_TOKEN_ADDRESS: string;
  readonly VITE_MARKET_ADDRESS: string;
  readonly VITE_MATCH_ENGINE_ADDRESS: string;
  readonly VITE_STAKE_VAULT_ADDRESS: string;
  readonly VITE_REPUTATION_ENGINE_ADDRESS: string;
  readonly VITE_PARTNERSHIP_COVENANT_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
