import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { fetchAgents } from '@/lib/api';
import AgentCard from '@/components/ghost/AgentCard';
import { Button } from '@/components/ui/button';
import type { AgentResponse } from '@/types';

// Map AgentResponse → AgentCard's UI Agent shape
function toUIAgent(a: AgentResponse) {
  return {
    id: String(a.token_id),
    name: a.name ?? `Agent #${a.token_id}`,
    strategy: (a.strategy ?? 'BALANCED').toLowerCase() as 'aggressive' | 'balanced' | 'conservative',
    state: (a.state ?? 'ACTIVE').toLowerCase() as 'active' | 'elite' | 'bankrupt' | 'revived',
    capital: parseFloat(a.capital ?? '0') / 1e18,
    riskAppetite: a.risk_appetite ?? 50,
    winRate: a.win_count && (a.win_count + (a.loss_count ?? 0)) > 0
      ? a.win_count / (a.win_count + (a.loss_count ?? 0))
      : 0.5,
    totalTrades: (a.win_count ?? 0) + (a.loss_count ?? 0),
    reputationScore: a.reputation_score ?? 5000,
    owner: a.owner_address ?? '',
    createdAt: a.created_at ?? '',
    lastAction: a.last_action ?? '',
    commodity: (a.preferred_commodity ?? 'IRON').toLowerCase() as 'iron' | 'copper' | 'silicon' | 'energy',
  };
}

const Landing = () => {
  const { data: agentsRaw = [] } = useQuery({
    queryKey: ['agents-ticker'],
    queryFn: () => fetchAgents(20, 0),
    staleTime: 30_000,
  });

  const agents = agentsRaw.map(toUIAgent);
  const ticker = agents.length > 0 ? [...agents, ...agents] : [];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-4 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            <span className="text-primary glow-purple inline-block px-2">GHOST</span>{' '}
            <span className="text-foreground">ARENA</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Autonomous AI agents battle for arbitrage dominance on Monad.
            <br />
            <span className="text-primary">Mint. Stake. Watch them trade.</span>
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/arena">
              <Button size="lg" className="font-bold tracking-wider">
                Enter Arena
              </Button>
            </Link>
            <Link to="/mint">
              <Button size="lg" variant="outline" className="font-bold tracking-wider border-primary/50 text-primary hover:bg-primary/10">
                Mint Agent
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Agent Ticker */}
      <section className="border-y border-border bg-card/50 overflow-hidden py-3">
        {ticker.length > 0 ? (
          <div className="flex animate-ticker" style={{ width: 'max-content' }}>
            {ticker.map((agent, i) => (
              <div key={`${agent.id}-${i}`} className="mx-2 shrink-0 w-[280px]">
                <AgentCard agent={agent} compact />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-1">Loading agents…</div>
        )}
      </section>

      {/* Stats */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Active Agents', value: '847' },
            { label: 'Total Trades', value: '2.4M' },
            { label: 'GHOST Staked', value: '12.8M' },
            { label: 'Avg TPS', value: '842' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-4"
            >
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground tracking-wider uppercase mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Landing;
