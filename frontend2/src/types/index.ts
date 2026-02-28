// ── Core enums (match backend exactly) ──────────────────────────────────────
export type AgentTier = 'ACTIVE' | 'ELITE' | 'BANKRUPT' | 'REVIVED';
export type AgentStrategy = 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
// UI alias (lowercase) used only in RiskDNASlider
export type Strategy = 'aggressive' | 'balanced' | 'conservative';
export type TradeAction = 'BID' | 'ASK' | 'HOLD' | 'PARTNER';
export type Commodity = 'ETH' | 'SOL' | 'MATIC' | 'BNB';
export type OrderSide = 'BID' | 'ASK';
export type OrderStatus = 'OPEN' | 'MATCHED' | 'EXPIRED' | 'CANCELLED';
export type CovenantStatus = 'PROPOSED' | 'ACTIVE' | 'DISSOLVED';

// ── Backend API response shapes (snake_case) ─────────────────────────────────
export interface AgentResponse {
  token_id: number;
  owner_address: string;
  risk_appetite: number;
  strategy: AgentStrategy;
  initial_capital: string; // wei
  capital: string;         // wei
  state: AgentTier;
  win_count: number;
  loss_count: number;
  created_at: number;
  last_tick_at: number;
  score?: number; // 0-10000
  // optional enriched fields
  name?: string;
  reputation_score?: number;
  last_action?: string;
  preferred_commodity?: Commodity;
}

export interface TradeResponse {
  bid_order_id: string;
  ask_order_id: string;
  agent_bid: number;
  agent_ask: number;
  commodity: Commodity;
  matched_qty: string;
  matched_price: string;
  fee_burned: string;
  block_number: number;
  timestamp: number;
}

export interface OrderResponse {
  order_id: string;
  agent_id: number;
  agent_owner: string;
  commodity: Commodity;
  side: OrderSide;
  price: string;
  qty: string;
  filled_qty: string;
  status: OrderStatus;
  ttl_blocks: number;
  created_block: number;
  created_at: number;
}

export interface AgentDecisionResponse {
  tx_hash: string;
  agent_id: string;
  action: TradeAction;
  commodity: Commodity;
  price: string;
  qty: string;
  reasoning: string;
  confidence: number;
  block_number: number;
  timestamp: number;
}

export interface ReputationResponse {
  agent_id: number;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  profit_factor: number;
  max_drawdown: string;
  score: number;
  apy_multiplier: number;
}

export interface LeaderboardEntry {
  rank: number;
  agent_id: number;
  score: number;
  state: AgentTier;
  capital: string;
}

export interface VaultResponse {
  agent_id: number;
  total_shares: string;
  total_deposited: string;
  total_rewards: string;
  apy_multiplier: number;
}

export interface StakerPositionResponse {
  agent_id: number;
  shares: string;
  pending_rewards: string;
}

export interface CovenantResponse {
  covenant_id: number;
  agent_a: number;
  agent_b: number;
  capital_a: string;
  capital_b: string;
  profit_split_a: number;
  profit_split_b: number;
  status: CovenantStatus;
  proposed_at: number;
  activated_at: number;
  dissolved_at: number;
  total_profit_distributed: string;
}

export interface TokenStatsResponse {
  total_supply: string;
  circulating_supply: string;
  total_burned: string;
  burn_rate_24h: string;
}

export interface CandleResponse {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SpreadResponse {
  commodity: string;
  best_bid: string;
  best_ask: string;
  mid_price: number;
  spread_pct: number;
}

export interface EngineStatusResponse {
  current_block: number;
  last_batch_block: number;
  queue_depth: number;
  total_trades: number;
  total_volume: string;
}

export interface OracleFeedResponse {
  commodity: Commodity | string;
  asset?: string;        // backend alias
  price: string | number;
  confidence?: number;
  updated_at: number;
  source?: string;
}

// ── WebSocket event union ─────────────────────────────────────────────────────
export type WSEvent =
  | { type: 'trade';     data: TradeResponse }
  | { type: 'orderbook'; data: { commodity: Commodity; bids: OrderBookEntry[]; asks: OrderBookEntry[] } }
  | { type: 'price';     data: OracleFeedResponse }
  | { type: 'lifecycle'; data: { agent_id: number; event: string; block: number; details: string } }
  | { type: 'decision';  data: AgentDecisionResponse }
  | { type: 'burn';      data: { amount: string; total_burned: string; block_number: number } }
  | { type: 'block';     data: { block_number: number; tps: number } };

// ── UI-only types (for components / mock) ────────────────────────────────────
export interface RiskDNA {
  riskAppetite: number;
  strategy: Strategy;
  startingCapital: number;
}

/** Lightweight view of an agent used by UI components */
export interface Agent {
  id: string;
  name: string;
  tier: AgentTier;
  owner: string;
  riskDNA: RiskDNA;
  capital: number;
  maxCapital: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  maxDrawdown: number;
  avgTradeDuration: string;
  reputation: number;
  totalStaked: number;
  apyMultiplier: number;
  createdAtBlock: number;
}

export interface TradeEntry {
  id: string;
  timestamp: number;
  agentFrom: string;
  agentTo: string;
  commodity: Commodity;
  quantity: number;
  price: number;
  status: 'MATCHED' | 'EXPIRED' | 'PENDING';
  side: 'buy' | 'sell';
}

export interface Decision {
  id: string;
  block: number;
  action: TradeAction;
  asset: Commodity;
  price: number;
  quantity: number;
  reasoning: string;
  confidence: number;
  txHash: string;
}

export interface Staker {
  address: string;
  stakedAmount: number;
  earned: number;
  apyMultiplier: number;
}

export interface LifecycleEvent {
  type: 'BANKRUPTCY' | 'REVIVAL' | 'PARTNERSHIP' | 'ELITE_PROMOTION' | 'CREATED';
  block: number;
  timestamp: number;
  details: string;
}

export interface CommodityPrice {
  commodity: Commodity;
  label: string;
  price: number;
  change24h: number;
  history: number[];
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

export interface StakePosition {
  agentId: string;
  agentName: string;
  staked: number;
  earned: number;
  unlockTime: number;
}

export interface OpenOrder {
  id: string;
  side: 'buy' | 'sell';
  asset: Commodity;
  price: number;
  quantity: number;
  filledPercent: number;
}
