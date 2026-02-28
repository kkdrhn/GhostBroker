import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGhostStore } from '@/store';
import { fetchAgents, fetchLeaderboard, fetchOracleFeeds } from '@/lib/api';
import { useGhostWS } from '@/lib/ws';
import AgentCard from '@/components/ghost/AgentCard';
import LiveFeed from '@/components/ghost/LiveFeed';
import CommodityTicker from '@/components/ghost/CommodityTicker';
import type { AgentResponse, OracleFeedResponse, Commodity } from '@/types';

/** Convert wei string to float MON */
const wei2mon = (wei: string) => Number(BigInt(wei) / BigInt('1000000000')) / 1e9;

/** Map AgentResponse → UI Agent shape expected by AgentCard */
function toUIAgent(a: AgentResponse) {
  const cap = wei2mon(a.capital);
  const initCap = wei2mon(a.initial_capital);
  const wins = a.win_count;
  const losses = a.loss_count;
  const total = wins + losses || 1;
  return {
    id: String(a.token_id),
    name: `Agent #${a.token_id}`,
    tier: a.state,
    owner: a.owner_address,
    riskDNA: {
      riskAppetite: a.risk_appetite,
      strategy: a.strategy.toLowerCase() as 'aggressive' | 'balanced' | 'conservative',
      startingCapital: initCap,
    },
    capital: cap,
    maxCapital: Math.max(cap, initCap * 2),
    winRate: +((wins / total) * 100).toFixed(1),
    totalTrades: total,
    profitFactor: wins > 0 ? +(wins / Math.max(losses, 1)).toFixed(2) : 0,
    maxDrawdown: 0,
    avgTradeDuration: '—',
    reputation: a.score ?? 0,
    totalStaked: 0,
    apyMultiplier: 1,
    createdAtBlock: a.created_at,
  };
}

/** Map OracleFeedResponse → UI CommodityPrice shape */
function toUICommodity(f: OracleFeedResponse) {
  return {
    commodity: f.commodity,
    label: f.commodity,
    price: Number(f.price),
    change24h: 0,
    history: [] as number[],
  };
}

const COMMODITY_LIST: Commodity[] = ['GHOST_ORE', 'PHANTOM_GAS', 'VOID_CHIP', 'MON_USDC'];

const Arena = () => {
  const { recentTrades, handleWSEvent, setAgents, setLeaderboard, prices } = useGhostStore();

  // ── REST fetches ────────────────────────────────────────────────────────────
  const { data: agentData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(50),
    onSuccess: (data) => setAgents(data),
  } as Parameters<typeof useQuery>[0]);

  useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => fetchLeaderboard(20),
    onSuccess: (data) => setLeaderboard(data),
  } as Parameters<typeof useQuery>[0]);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  useGhostWS({
    channels: ['market.trades', 'agent.lifecycle', 'agent.decisions', 'oracle.prices', 'chain.block'],
    onEvent: handleWSEvent,
  });

  const uiAgents = (agentData ?? []).map(toUIAgent);

  // Commodity prices from WS or fallback placeholders
  const commodityTickers = COMMODITY_LIST.map((c) => {
    const feed = prices[c];
    return feed
      ? toUICommodity(feed)
      : { commodity: c, label: c, price: 0, change24h: 0, history: [] };
  });

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-48px)] overflow-hidden">
      {/* Left — Agent List */}
      <div className="w-full lg:w-80 border-r border-border overflow-y-auto p-3 space-y-2 shrink-0">
        <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-2 px-1">
          Live Agents ({uiAgents.length})
        </div>
        {uiAgents.length === 0 && (
          <div className="text-xs text-muted-foreground p-4 text-center animate-pulse">
            Loading agents…
          </div>
        )}
        {uiAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Center — Ghost Feed */}
      <div className="flex-1 border-r border-border overflow-hidden">
        <LiveFeed trades={recentTrades} />
      </div>

      {/* Right — Commodity Prices */}
      <div className="w-full lg:w-72 overflow-y-auto p-3 space-y-2 shrink-0">
        <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-2 px-1">
          Commodities
        </div>
        {commodityTickers.map((c) => (
          <CommodityTicker key={c.commodity} data={c} />
        ))}
      </div>
    </div>
  );
};

export default Arena;
