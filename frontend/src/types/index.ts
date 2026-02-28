/** Shared TypeScript types matching the API schemas */

export type AgentState    = "ACTIVE" | "ELITE" | "BANKRUPT" | "REVIVED";
export type AgentStrategy = "AGGRESSIVE" | "BALANCED" | "CONSERVATIVE";
export type OrderSide     = "BID" | "ASK";
export type OrderStatus   = "OPEN" | "MATCHED" | "EXPIRED" | "CANCELLED";
export type CovenantStatus = "PROPOSED" | "ACTIVE" | "DISSOLVED";

export interface Agent {
  token_id:        number;
  owner_address:   string;
  risk_appetite:   number;
  strategy:        AgentStrategy;
  initial_capital: string;
  capital:         string;
  state:           AgentState;
  win_count:       number;
  loss_count:      number;
  created_at:      number;
  last_tick_at:    number;
  score?:          number;
}

export interface Order {
  order_id:      string;
  agent_id:      number;
  agent_owner:   string;
  commodity:     string;
  side:          OrderSide;
  price:         string;
  qty:           string;
  filled_qty:    string;
  status:        OrderStatus;
  ttl_blocks:    number;
  created_block: number;
  created_at:    number;
}

export interface Trade {
  bid_order_id:  string;
  ask_order_id:  string;
  agent_bid:     number;
  agent_ask:     number;
  commodity:     string;
  matched_qty:   string;
  matched_price: string;
  fee_burned:    string;
  block_number:  number;
  timestamp:     number;
}

export interface Reputation {
  agent_id:       number;
  total_trades:   number;
  wins:           number;
  losses:         number;
  win_rate:       number;
  profit_factor:  number;
  max_drawdown:   string;
  score:          number;
  apy_multiplier: number;
}

export interface Vault {
  agent_id:        number;
  total_shares:    string;
  total_deposited: string;
  total_rewards:   string;
  apy_multiplier:  number;
}

export interface Covenant {
  covenant_id:               number;
  agent_a:                   number;
  agent_b:                   number;
  capital_a:                 string;
  capital_b:                 string;
  profit_split_a:            number;
  profit_split_b:            number;
  status:                    CovenantStatus;
  proposed_at:               number;
  activated_at:              number;
  dissolved_at:              number;
  total_profit_distributed:  string;
}

export interface AgentDecision {
  tx_hash:      string;
  agent_id:     string;
  action:       "BID" | "ASK" | "HOLD" | "PARTNER";
  commodity:    string;
  price:        string;
  qty:          string;
  reasoning:    string;
  confidence:   number;
  block_number: number;
  timestamp:    number;
}

export interface LeaderboardEntry {
  rank:     number;
  agent_id: number;
  score:    number;
  state:    AgentState;
  capital:  string;
}

export interface OracleFeed {
  asset:      string;
  price:      number;
  confidence: number;
  updated_at: number;
}

export interface TokenStats {
  total_supply:       string;
  circulating_supply: string;
  total_burned:       string;
  burn_rate_24h:      string;
}

// ── WebSocket event types ──────────────────────────────────────────────────────
export type WSEvent =
  | { type: "trade";     data: Trade }
  | { type: "diff";      data: { bids: [string, string][]; asks: [string, string][] } }
  | { type: "price";     commodity: string; price: number; confidence: number }
  | { type: "lifecycle"; agentId: number; from: AgentState; to: AgentState }
  | { type: "decision";  data: AgentDecision }
  | { type: "burn";      amount: string; totalBurned: string };
