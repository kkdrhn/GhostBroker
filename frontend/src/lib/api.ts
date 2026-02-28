/** API client — thin fetch wrapper for all REST endpoints */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

import type {
  Agent, Trade, Reputation, LeaderboardEntry,
  Vault, Covenant, OracleFeed, TokenStats, AgentDecision,
} from "@/types";

// ── Agents ─────────────────────────────────────────────────────────────────────
export const fetchAgents   = ()              => get<Agent[]>("/agents");
export const fetchAgent    = (id: number)    => get<Agent>(`/agents/${id}`);
export const fetchAgentPnl = (id: number)    => get<{ realized: string; unrealized: string; total: string }>(`/agents/${id}/pnl`);
export const fetchDecisions = (id: number)   => get<AgentDecision[]>(`/agents/${id}/decisions`);

// ── Market ─────────────────────────────────────────────────────────────────────
export const fetchOrderbook = (commodity: string) =>
  get<{ bids: [string, string][]; asks: [string, string][] }>(`/market/orderbook/${commodity}`);

export const fetchTrades    = (limit = 50) => get<Trade[]>(`/market/trades?limit=${limit}`);
export const fetchCandles   = (commodity: string, interval = "1m") =>
  get<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]>(
    `/market/candles/${commodity}?interval=${interval}`
  );
export const fetchPrice = (commodity: string) =>
  get<{ commodity: string; price: string; confidence: number; updated_at: number }>(`/market/price/${commodity}`);

// ── Engine ─────────────────────────────────────────────────────────────────────
export const fetchEngineStatus = () =>
  get<{ current_block: number; total_trades: number; total_volume: string; queue_depth: number }>("/engine/status");

// ── Reputation ─────────────────────────────────────────────────────────────────
export const fetchLeaderboard  = (limit = 20) => get<LeaderboardEntry[]>(`/reputation/leaderboard?limit=${limit}`);
export const fetchReputation   = (id: number)  => get<Reputation>(`/reputation/${id}`);
export const fetchTiers        = ()             =>
  get<{ ACTIVE: number; ELITE: number; BANKRUPT: number; REVIVED: number }>("/reputation/tiers");

// ── Staking ────────────────────────────────────────────────────────────────────
export const fetchVaults   = ()           => get<Vault[]>("/stake/vaults");
export const fetchVault    = (id: number) => get<Vault>(`/stake/vaults/${id}`);
export const fetchRewards  = (addr: string) => get<{ claimable: string; claimed: string }>(`/stake/rewards/${addr}`);

// ── Partnerships ───────────────────────────────────────────────────────────────
export const fetchPartnerships = () => get<Covenant[]>("/partnerships");
export const fetchCovenant     = (id: number) => get<Covenant>(`/partnerships/${id}`);

// ── Token ──────────────────────────────────────────────────────────────────────
export const fetchTokenStats = () => get<TokenStats>("/token/stats");
export const fetchBurns      = () => get<{ tx_hash: string; amount: string; total_burned: string; timestamp: number }[]>("/token/burns");

// ── Oracle ─────────────────────────────────────────────────────────────────────
export const fetchFeeds       = () => get<OracleFeed[]>("/oracle/feeds");
export const fetchFeed        = (asset: string) => get<OracleFeed>(`/oracle/feeds/${asset}`);
export const fetchAllDecisions = () => get<AgentDecision[]>("/oracle/decisions");
