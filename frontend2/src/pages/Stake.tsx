import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAgents, fetchVault, fetchStakerPosition, postDeposit, postWithdraw, postClaimRewards } from '@/lib/api';
import { useGhostStore } from '@/store';
import AgentCard from '@/components/ghost/AgentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
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

const Stake = () => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const { walletAddress, isConnected } = useGhostStore();

  const { data: agentData = [] } = useQuery<AgentResponse[]>({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(50),
  });

  const { data: vault } = useQuery({
    queryKey: ['vault', selectedId],
    queryFn: () => fetchVault(selectedId!),
    enabled: selectedId !== null,
  });

  const { data: position } = useQuery({
    queryKey: ['position', selectedId, walletAddress],
    queryFn: () => fetchStakerPosition(selectedId!, walletAddress!),
    enabled: selectedId !== null && !!walletAddress,
  });

  const activeAgents = agentData
    .filter((a) => a.state !== 'BANKRUPT')
    .filter((a) => `Agent #${a.token_id}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const selected = agentData.find((a) => a.token_id === selectedId);
  const uiSelected = selected ? toUIAgent(selected) : null;

  const handleDeposit = async () => {
    if (!selectedId || !walletAddress || !depositAmount) return;
    const amountWei = BigInt(Math.floor(parseFloat(depositAmount) * 1e18)).toString();
    const result = await postDeposit(selectedId, amountWei, walletAddress);
    console.log('Deposit calldata:', result);
    // TODO: send via wagmi sendTransaction
  };

  const handleClaim = async () => {
    if (!selectedId || !walletAddress) return;
    const result = await postClaimRewards(selectedId, walletAddress);
    console.log('Claim calldata:', result);
    // TODO: send via wagmi sendTransaction
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-foreground mb-1">Stake GHOST</h1>
      <p className="text-sm text-muted-foreground mb-6">Select an agent and stake GHOST to earn yield</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent selector */}
        <div className="lg:col-span-2 space-y-3">
          <Input
            placeholder="Search agents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-muted border-border"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
            {activeAgents.map((agent) => (
              <div
                key={agent.token_id}
                onClick={() => setSelectedId(agent.token_id)}
                className={cn(selectedId === agent.token_id && 'ring-1 ring-primary rounded-lg')}
              >
                <AgentCard agent={toUIAgent(agent)} />
              </div>
            ))}
          </div>
        </div>

        {/* Stake panel */}
        <div>
          {uiSelected && vault ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-border bg-card text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Deposited</span>
                  <span className="text-foreground">{wei2mon(vault.total_deposited).toLocaleString()} GHOST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">APY Multiplier</span>
                  <span className="text-ghost-gold">{(vault.apy_multiplier / 100).toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Rewards</span>
                  <span className="text-ghost-green">{wei2mon(vault.total_rewards).toLocaleString()} GHOST</span>
                </div>
                {position && (
                  <div className="flex justify-between border-t border-border pt-1 mt-1">
                    <span className="text-muted-foreground">Your Pending</span>
                    <span className="text-ghost-cyan">{wei2mon(position.pending_rewards).toLocaleString()} GHOST</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Deposit Amount (GHOST)</label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="bg-muted border-border"
                />
                <Button
                  className="w-full text-xs"
                  disabled={!isConnected || !depositAmount}
                  onClick={handleDeposit}
                >
                  {isConnected ? 'Deposit GHOST' : 'Connect Wallet First'}
                </Button>
                {position && (
                  <Button
                    variant="outline"
                    className="w-full text-xs border-ghost-green text-ghost-green hover:bg-ghost-green/10"
                    onClick={handleClaim}
                  >
                    Claim {wei2mon(position.pending_rewards).toFixed(2)} GHOST
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
              {selectedId && !vault ? 'Loading vault…' : 'Select an agent to stake on'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stake;
