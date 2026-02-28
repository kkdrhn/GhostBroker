/**
 * Ghost Broker — REST API client
 * All endpoints match FastAPI routers in /api/routers/
 */
import type {
  AgentResponse,
  AgentDecisionResponse,
  OrderResponse,
  TradeResponse,
  CandleResponse,
  SpreadResponse,
  ReputationResponse,
  LeaderboardEntry,
  VaultResponse,
  StakerPositionResponse,
  CovenantResponse,
  TokenStatsResponse,
  EngineStatusResponse,
  OracleFeedResponse,
} from '@/types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── Agents ────────────────────────────────────────────────────────────────────
export const fetchAgents = (limit = 50, offset = 0) =>
  get<AgentResponse[]>('/v1/agents', { limit, offset });

export const fetchAgent = (tokenId: number) =>
  get<AgentResponse>(`/v1/agents/${tokenId}`);

export const fetchAgentDecisions = (tokenId: number, limit = 20) =>
  get<AgentDecisionResponse[]>(`/v1/agents/${tokenId}/decisions`, { limit });

export const fetchAgentLifecycle = (tokenId: number) =>
  get<{ events: { type: string; block: number; timestamp: number; details: string }[] }>(
    `/v1/agents/${tokenId}/lifecycle`,
  );

export const fetchAgentOrders = (tokenId: number, status?: string) =>
  get<OrderResponse[]>(`/v1/agents/${tokenId}/orders`, status ? { status } : undefined);

// ── Market ────────────────────────────────────────────────────────────────────
export const fetchOrderBook = (commodity: string) =>
  get<{ bids: OrderResponse[]; asks: OrderResponse[] }>(`/v1/market/orderbook/${commodity}`);

export const fetchTrades = (commodity?: string, limit = 50) =>
  get<TradeResponse[]>('/v1/market/trades', {
    limit,
    ...(commodity ? { commodity } : {}),
  });

export const fetchCandles = (commodity: string, resolution = '1m', limit = 100) =>
  get<CandleResponse[]>('/v1/market/candles', { commodity, resolution, limit });

export const fetchSpread = (commodity: string) =>
  get<SpreadResponse>(`/v1/market/spread/${commodity}`);

// ── Engine ────────────────────────────────────────────────────────────────────
export const fetchEngineStatus = () =>
  get<EngineStatusResponse>('/v1/engine/status');

export const fetchMatchesByBlock = (block: number) =>
  get<TradeResponse[]>(`/v1/engine/matches/${block}`);

// ── Reputation ─────────────────────────────────────────────────────────────────
export const fetchReputation = (agentId: number) =>
  get<ReputationResponse>(`/v1/reputation/${agentId}`);

export const fetchLeaderboard = (limit = 20) =>
  get<LeaderboardEntry[]>('/v1/reputation/leaderboard', { limit });

// ── Staking ───────────────────────────────────────────────────────────────────
export const fetchVault = (agentId: number) =>
  get<VaultResponse>(`/v1/stake/${agentId}`);

export const fetchStakerPosition = (agentId: number, address: string) =>
  get<StakerPositionResponse>(`/v1/stake/${agentId}/position/${address}`);

export const postDeposit = (agentId: number, amount: string, staker: string) =>
  post<{ calldata: string; to: string }>('/v1/stake/deposit/calldata', {
    agent_id: agentId,
    amount,
    staker,
  });

export const postWithdraw = (agentId: number, shares: string, staker: string) =>
  post<{ calldata: string; to: string }>('/v1/stake/withdraw/calldata', {
    agent_id: agentId,
    shares,
    staker,
  });

export const postClaimRewards = (agentId: number, staker: string) =>
  post<{ calldata: string; to: string }>('/v1/stake/claim/calldata', {
    agent_id: agentId,
    staker,
  });

// ── Partnerships ──────────────────────────────────────────────────────────────
export const fetchCovenant = (covenantId: number) =>
  get<CovenantResponse>(`/v1/partnerships/${covenantId}`);

export const fetchAgentCovenant = (agentId: number) =>
  get<CovenantResponse>(`/v1/partnerships/agent/${agentId}`);

// ── Token ─────────────────────────────────────────────────────────────────────
export const fetchTokenStats = () =>
  get<TokenStatsResponse>('/v1/token/stats');

// ── Oracle ────────────────────────────────────────────────────────────────────
export const fetchOracleFeeds = () =>
  get<OracleFeedResponse[]>('/v1/oracle/feeds');

export const fetchOracleFeed = (commodity: string) =>
  get<OracleFeedResponse>(`/v1/oracle/feeds/${commodity}`);

// ── Health ────────────────────────────────────────────────────────────────────
export const fetchHealth = () =>
  get<{ status: string; chain: string }>('/health');
