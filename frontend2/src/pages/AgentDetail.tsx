import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAgent,
  fetchReputation,
  fetchAgentDecisions,
  fetchAgentLifecycle,
  fetchAgentOrders,
} from '@/lib/api';
import { MONADSCAN_ADDR } from '@/config/chain';
import AgentAvatar from '@/components/ghost/AgentAvatar';
import TierBadge from '@/components/ghost/TierBadge';
import CapitalChart from '@/components/ghost/CapitalChart';
import LifecycleTimeline from '@/components/ghost/LifecycleTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { MOCK_CAPITAL_HISTORY } from '@/data/mock';

// ── Güvenli BigInt dönüşümü — undefined/null/NaN çökmez ──────────────────────
const wei2mon = (wei: unknown): number => {
  try {
    const s = String(wei ?? '0').split('.')[0]; // float olabilir, noktayı at
    if (!s || s === 'undefined' || s === 'null' || s === 'NaN') return 0;
    return Number(BigInt(s) / BigInt('1000000000')) / 1e9;
  } catch {
    return 0;
  }
};

const AgentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const tokenId = Number(id);

  // Decisions sayfalama state
  const [decPage, setDecPage] = useState(1);
  const DEC_PAGE_SIZE = 20;

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

  // Sayfalı decisions — backend /v1/agents/{id}/decisions?page=X&limit=Y
  const { data: decisionPage, isLoading: decLoading } = useQuery({
    queryKey: ['decisions', tokenId, decPage],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/v1/agents/${tokenId}/decisions?page=${decPage}&limit=${DEC_PAGE_SIZE}`);
      if (!res.ok) return { items: [], total: 0, total_pages: 1 };
      const data = await res.json();
      // Eski liste formatı veya yeni sayfalı format
      if (Array.isArray(data)) return { items: data, total: data.length, total_pages: 1 };
      return data as { items: unknown[]; total: number; total_pages: number };
    },
    enabled: !isNaN(tokenId),
    staleTime: 5000,
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

  if (agentLoading || !agent) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-muted-foreground text-sm animate-pulse">
        Loading Agent #{tokenId}…
      </div>
    );
  }

  const capital = wei2mon(agent.capital);
  const wins   = agent.win_count   ?? 0;
  const losses = agent.loss_count  ?? 0;
  const total  = wins + losses || 1;
  const winRate = +((wins / total) * 100).toFixed(1);

  const riskDNA = {
    riskAppetite: agent.risk_appetite ?? 50,
    strategy: (agent.strategy ?? 'balanced').toLowerCase() as 'aggressive' | 'balanced' | 'conservative',
    startingCapital: wei2mon(agent.initial_capital),
  };

  const stats = [
    { label: 'Total Trades',  value: (wins + losses).toString() },
    { label: 'Win Rate',      value: `${winRate}%` },
    { label: 'Profit Factor', value: rep?.profit_factor != null ? String(rep.profit_factor.toFixed(2)) : '—' },
    { label: 'Max Drawdown',  value: rep?.max_drawdown  != null ? `${rep.max_drawdown}%` : '—' },
    { label: 'Score',         value: rep?.composite_score != null ? `${rep.composite_score}` : '—' },
    { label: 'Capital',       value: `${capital.toLocaleString(undefined, { maximumFractionDigits: 4 })} MON` },
  ];

  const lifecycleEvents = (lifecycle?.events ?? []).map((e) => ({
    type: e.type as 'BANKRUPTCY' | 'REVIVAL' | 'PARTNERSHIP' | 'ELITE_PROMOTION' | 'CREATED',
    block: e.block,
    timestamp: e.timestamp,
    details: e.details,
  }));

  const decisions     = (decisionPage?.items ?? []) as Record<string, unknown>[];
  const decTotal      = decisionPage?.total      ?? 0;
  const decTotalPages = decisionPage?.total_pages ?? 1;

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
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm font-bold text-foreground mb-4">Capital History (Mock Data)</div>
            <CapitalChart data={MOCK_CAPITAL_HISTORY} />
          </div>
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
                  <TableHead className="text-[10px]">ZAMAN</TableHead>
                  <TableHead className="text-[10px]">ACTION</TableHead>
                  <TableHead className="text-[10px]">ASSET</TableHead>
                  <TableHead className="text-[10px] text-right">PRICE</TableHead>
                  <TableHead className="text-[10px] text-right">QTY</TableHead>
                  <TableHead className="text-[10px] text-right">CONF.</TableHead>
                  <TableHead className="text-[10px]">REASONING</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4 animate-pulse">
                      Yükleniyor…
                    </TableCell>
                  </TableRow>
                )}
                {!decLoading && decisions.map((d, i) => {
                  const action   = String(d.action     ?? '—');
                  const asset    = String(d.commodity  ?? '—');
                  const price    = String(d.price      ?? '—');
                  const qty      = String(d.qty        ?? '—');
                  const conf     = parseFloat(String(d.confidence ?? 0));
                  const reason   = String(d.reasoning  ?? '');
                  const ts       = Number(d.timestamp  ?? d.block_number ?? 0);
                  const timeStr  = ts ? new Date(ts > 1e12 ? ts : ts * 1000).toLocaleTimeString('tr-TR', { hour12: false }) : '—';
                  const txHash   = String(d.tx_hash ?? i);
                  return (
                    <TableRow key={txHash} className="border-border text-xs">
                      <TableCell className="font-mono text-muted-foreground">{timeStr}</TableCell>
                      <TableCell className={cn('font-bold',
                        action === 'BID'  ? 'text-ghost-green' :
                        action === 'ASK'  ? 'text-red-400' :
                        action === 'HOLD' ? 'text-yellow-400' : 'text-purple-400'
                      )}>{action}</TableCell>
                      <TableCell>{asset}</TableCell>
                      <TableCell className="text-right font-mono">{price}</TableCell>
                      <TableCell className="text-right font-mono">{qty}</TableCell>
                      <TableCell className="text-right">{(conf * 100).toFixed(0)}%</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground text-[10px]">{reason}</TableCell>
                    </TableRow>
                  );
                })}
                {!decLoading && decisions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-4">
                      Henüz karar yok (~20s bekle)
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Sayfalama */}
          {decTotalPages > 1 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-[10px] text-muted-foreground font-mono">
                {decTotal} karar · sayfa {decPage}/{decTotalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setDecPage(p => Math.max(1, p - 1))}
                  disabled={decPage <= 1}
                  className="text-[10px] px-3 py-1 rounded bg-white/5 text-muted-foreground disabled:opacity-30 hover:bg-white/10"
                >‹ Önceki</button>
                <button
                  onClick={() => setDecPage(p => Math.min(decTotalPages, p + 1))}
                  disabled={decPage >= decTotalPages}
                  className="text-[10px] px-3 py-1 rounded bg-white/5 text-muted-foreground disabled:opacity-30 hover:bg-white/10"
                >Sonraki ›</button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Vault / stake tab */}
        <TabsContent value="stake" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Strateji',    value: agent?.strategy ?? '—' },
              { label: 'Kapital',     value: `${capital.toLocaleString()} MON` },
              { label: 'Karar Sayısı', value: `${decTotal} karar` },
              { label: 'Win Rate',    value: rep ? `${(rep.win_rate * 100).toFixed(1)}%` : '—' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-lg border border-border bg-card text-center">
                <div className="text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-lg border border-border bg-card/50 text-center text-xs text-muted-foreground">
            Staking devre dışı bırakıldı.
          </div>
        </TabsContent>
      </Tabs>

      {/* Lifecycle Timeline */}
      <LifecycleTimeline events={lifecycleEvents} />
    </div>
  );
};

export default AgentDetail;
