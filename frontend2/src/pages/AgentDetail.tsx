import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAgent,
  fetchReputation,
  fetchAgentDecisions,
  fetchAgentLifecycle,
  fetchAgentOrders,
  fetchVault,
} from '@/lib/api';
import { MONADSCAN_ADDR } from '@/config/chain';
import AgentAvatar from '@/components/ghost/AgentAvatar';
import TierBadge from '@/components/ghost/TierBadge';
import CapitalChart from '@/components/ghost/CapitalChart';
import LifecycleTimeline from '@/components/ghost/LifecycleTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const wei2mon = (wei: string) => Number(BigInt(wei) / BigInt('1000000000')) / 1e9;

const AgentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const tokenId = Number(id);

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', tokenId],
    queryFn: () => fetchAgent(tokenId),
    enabled: !isNaN(tokenId),
  });

  const { data: rep } = useQuery({
    queryKey: ['reputation', tokenId],
    queryFn: () => fetchReputation(tokenId),
    enabled: !isNaN(tokenId),
  });

  const { data: decisions = [] } = useQuery({
    queryKey: ['decisions', tokenId],
    queryFn: () => fetchAgentDecisions(tokenId, 25),
    enabled: !isNaN(tokenId),
  });

  const { data: lifecycle } = useQuery({
    queryKey: ['lifecycle', tokenId],
    queryFn: () => fetchAgentLifecycle(tokenId),
    enabled: !isNaN(tokenId),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', tokenId],
    queryFn: () => fetchAgentOrders(tokenId),
    enabled: !isNaN(tokenId),
  });

  const { data: vault } = useQuery({
    queryKey: ['vault', tokenId],
    queryFn: () => fetchVault(tokenId),
    enabled: !isNaN(tokenId),
  });

  if (agentLoading || !agent) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-muted-foreground text-sm animate-pulse">
        Loading Agent #{tokenId}…
      </div>
    );
  }

  const capital = wei2mon(agent.capital);
  const wins = agent.win_count;
  const losses = agent.loss_count;
  const total = wins + losses || 1;
  const winRate = +((wins / total) * 100).toFixed(1);

  const riskDNA = {
    riskAppetite: agent.risk_appetite,
    strategy: agent.strategy.toLowerCase() as 'aggressive' | 'balanced' | 'conservative',
    startingCapital: wei2mon(agent.initial_capital),
  };

  const stats = [
    { label: 'Total Trades', value: total.toString() },
    { label: 'Win Rate',     value: `${winRate}%` },
    { label: 'Profit Factor', value: rep ? rep.profit_factor.toFixed(2) : '—' },
    { label: 'Max Drawdown', value: rep ? `${rep.max_drawdown}` : '—' },
    { label: 'Score',        value: rep ? `${rep.score}/10000` : '—' },
    { label: 'Capital',      value: `${capital.toLocaleString()} MON` },
  ];

  const lifecycleEvents = (lifecycle?.events ?? []).map((e) => ({
    type: e.type as 'BANKRUPTCY' | 'REVIVAL' | 'PARTNERSHIP' | 'ELITE_PROMOTION' | 'CREATED',
    block: e.block,
    timestamp: e.timestamp,
    details: e.details,
  }));

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <AgentAvatar riskDNA={riskDNA} size={64} />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Agent #{agent.token_id}</h1>
            <TierBadge tier={agent.state} />
          </div>
          <a
            href={MONADSCAN_ADDR(agent.owner_address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ghost-cyan hover:underline mt-1 block"
          >
            Owner: {agent.owner_address.slice(0, 6)}…{agent.owner_address.slice(-4)}
          </a>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="performance" className="mb-8">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="performance"  className="text-xs font-bold">Performance</TabsTrigger>
          <TabsTrigger value="decisions"    className="text-xs font-bold">Decision Log</TabsTrigger>
          <TabsTrigger value="stake"        className="text-xs font-bold">Vault</TabsTrigger>
        </TabsList>

        {/* Performance tab */}
        <TabsContent value="performance" className="mt-4 space-y-6">
          <CapitalChart data={[]} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="p-3 rounded-lg border border-border bg-card text-center">
                <div className="text-lg font-bold text-foreground">{s.value}</div>
                <div className="text-[10px] text-muted-foreground tracking-wider uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Open Orders */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border text-xs font-bold text-muted-foreground tracking-wider uppercase">
              Open Orders
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px]">SIDE</TableHead>
                  <TableHead className="text-[10px]">ASSET</TableHead>
                  <TableHead className="text-[10px] text-right">PRICE</TableHead>
                  <TableHead className="text-[10px] text-right">QTY</TableHead>
                  <TableHead className="text-[10px] text-right">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.order_id} className="border-border text-xs">
                    <TableCell className={cn('font-bold', o.side === 'BID' ? 'text-ghost-green' : 'text-ghost-red')}>
                      {o.side}
                    </TableCell>
                    <TableCell>{o.commodity}</TableCell>
                    <TableCell className="text-right font-mono">{wei2mon(o.price).toFixed(4)}</TableCell>
                    <TableCell className="text-right font-mono">{wei2mon(o.qty).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{o.status}</TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                      No open orders
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Decision log tab */}
        <TabsContent value="decisions" className="mt-4">
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px]">BLOCK</TableHead>
                  <TableHead className="text-[10px]">ACTION</TableHead>
                  <TableHead className="text-[10px]">ASSET</TableHead>
                  <TableHead className="text-[10px] text-right">PRICE</TableHead>
                  <TableHead className="text-[10px] text-right">QTY</TableHead>
                  <TableHead className="text-[10px] text-right">CONF.</TableHead>
                  <TableHead className="text-[10px]">REASONING</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decisions.map((d) => (
                  <TableRow key={d.tx_hash} className="border-border text-xs">
                    <TableCell className="font-mono text-muted-foreground">{d.block_number}</TableCell>
                    <TableCell className={cn('font-bold',
                      d.action === 'BID' ? 'text-ghost-green' :
                      d.action === 'ASK' ? 'text-ghost-red' :
                      'text-muted-foreground'
                    )}>{d.action}</TableCell>
                    <TableCell>{d.commodity}</TableCell>
                    <TableCell className="text-right font-mono">{d.price}</TableCell>
                    <TableCell className="text-right font-mono">{d.qty}</TableCell>
                    <TableCell className="text-right">{(d.confidence * 100).toFixed(0)}%</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{d.reasoning}</TableCell>
                  </TableRow>
                ))}
                {decisions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4">
                      No decisions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Vault / stake tab */}
        <TabsContent value="stake" className="mt-4">
          {vault ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Deposited', value: `${wei2mon(vault.total_deposited).toLocaleString()} GHOST` },
                { label: 'Total Rewards', value: `${wei2mon(vault.total_rewards).toLocaleString()} GHOST` },
                { label: 'Total Shares', value: wei2mon(vault.total_shares).toLocaleString() },
                { label: 'APY Multiplier', value: `${(vault.apy_multiplier / 100).toFixed(2)}x` },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-lg border border-border bg-card text-center">
                  <div className="text-xl font-bold text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Loading vault data…
            </div>
          )}
          <div className="mt-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-foreground">Stake on this agent</div>
                <div className="text-xs text-muted-foreground">Go to the Stake page to deposit GHOST</div>
              </div>
              <Button size="sm" className="text-xs" onClick={() => window.location.href = '/stake'}>
                Go to Stake
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Lifecycle Timeline */}
      <LifecycleTimeline events={lifecycleEvents} />
    </div>
  );
};

export default AgentDetail;
