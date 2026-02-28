import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAgents, fetchVault, fetchStakerPosition, postClaimRewards, postWithdraw } from '@/lib/api';
import { useGhostStore } from '@/store';
import AgentCard from '@/components/ghost/AgentCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { AgentResponse } from '@/types';

const wei2mon = (wei: string) => Number(BigInt(wei) / BigInt('1000000000')) / 1e9;

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

const Portfolio = () => {
  const { walletAddress, isConnected } = useGhostStore();

  const { data: allAgents = [] } = useQuery<AgentResponse[]>({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(50),
  });

  // Filter agents owned by connected wallet
  const ownedAgents = walletAddress
    ? allAgents.filter((a) => a.owner_address.toLowerCase() === walletAddress.toLowerCase())
    : [];

  const totalCapital = ownedAgents.reduce((sum, a) => sum + wei2mon(a.capital), 0);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-foreground mb-1">Portfolio</h1>
      <p className="text-sm text-muted-foreground mb-6">Your agents, stakes, and earnings</p>

      {!isConnected && (
        <div className="p-8 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground mb-8">
          Connect wallet to view your portfolio
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-lg border border-border bg-card text-center">
          <div className="text-2xl font-bold text-foreground">
            {totalCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })} MON
          </div>
          <div className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">Agent Capital</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card text-center">
          <div className="text-2xl font-bold text-foreground">{ownedAgents.length}</div>
          <div className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">Owned Agents</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card text-center">
          <div className="text-2xl font-bold text-ghost-green">
            {ownedAgents.filter((a) => a.state === 'ELITE').length}
          </div>
          <div className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">Elite Agents</div>
        </div>
      </div>

      {/* Owned Agents */}
      <div className="mb-8">
        <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-3">Your Agents</div>
        {ownedAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ownedAgents.map((agent) => (
              <AgentCard key={agent.token_id} agent={toUIAgent(agent)} />
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
            {isConnected ? 'No agents found for this wallet. Mint one!' : 'Connect wallet to see your agents.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
