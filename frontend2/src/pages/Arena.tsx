import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGhostStore } from '@/store';
import { fetchAgents, fetchLeaderboard, fetchOracleFeeds } from '@/lib/api';
import { useGhostWS } from '@/lib/ws';
import AgentCard from '@/components/ghost/AgentCard';
import LiveFeed from '@/components/ghost/LiveFeed';
import CommodityTicker from '@/components/ghost/CommodityTicker';
import type { AgentResponse, OracleFeedResponse, Commodity } from '@/types';

/** Convert wei string OR plain float string to MON float */
const wei2mon = (wei: string) => {
  try {
    const n = BigInt(wei);
    // 1e18 wei = 1 MON
    return Number(n / BigInt('1000000000000000000')) +
           Number(n % BigInt('1000000000000000000')) / 1e18;
  } catch {
    return parseFloat(wei) || 0;
  }
};

/** Map AgentResponse → UI Agent shape expected by AgentCard */
function toUIAgent(a: AgentResponse) {
  const cap = wei2mon(a.capital);
  const initCap = wei2mon(a.initial_capital);
  const wins = a.win_count;
  const losses = a.loss_count;
  const total = wins + losses || 1;
  return {
    id: String(a.token_id),
    name: a.name ?? `Agent #${a.token_id}`,
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
    commodity: (f.commodity || f.asset || '') as Commodity,
    label:     (f.commodity || f.asset || '') as string,
    price:     Number(f.price),
    change24h: 0,
    history:   [] as number[],
  };
}

const COMMODITY_LIST: Commodity[] = ['ETH', 'MON', 'SOL', 'MATIC', 'BNB'];

const Arena = () => {
  const { recentTrades, handleWSEvent, setAgents, setLeaderboard, prices } = useGhostStore();
  const setPrices = useGhostStore((s) => s.prices);
  const handleWS = useGhostStore((s) => s.handleWSEvent);

  // ── REST fetches ────────────────────────────────────────────────────────────
  const { data: agentData } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(50),
    refetchInterval: 5000,
    onSuccess: (data) => setAgents(data),
  } as Parameters<typeof useQuery>[0]);

  useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => fetchLeaderboard(20),
    onSuccess: (data) => setLeaderboard(data),
  } as Parameters<typeof useQuery>[0]);

  // İlk yüklemede REST'ten fiyatları çek
  const { data: oracleFeeds } = useQuery({
    queryKey: ['oracle-feeds'],
    queryFn: fetchOracleFeeds,
    refetchInterval: 3000,
  } as Parameters<typeof useQuery>[0]);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  useGhostWS({
    channels: ['market.trades', 'agent.lifecycle', 'agent.decisions', 'oracle.prices', 'chain.block'],
    onEvent: handleWSEvent,
  });

  const uiAgents = ((agentData as AgentResponse[]) ?? []).map(toUIAgent);

  // WS prices öncelikli, yoksa REST oracle feeds
  const commodityTickers = COMMODITY_LIST.map((c) => {
    const wsFeed = prices[c];
    if (wsFeed) return toUICommodity(wsFeed);
    const restFeed = (oracleFeeds as OracleFeedResponse[] | undefined)?.find(
      (f) => (f.commodity ?? f.asset) === c
    );
    if (restFeed) return toUICommodity(restFeed);
    return { commodity: c, label: c, price: 0, change24h: 0, history: [] };
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
