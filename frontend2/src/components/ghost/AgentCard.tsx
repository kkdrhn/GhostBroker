import React from 'react';
import type { Agent } from '@/types';
import AgentAvatar from './AgentAvatar';
import TierBadge from './TierBadge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface AgentCardProps {
  agent: Agent;
  compact?: boolean;
  className?: string;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, compact = false, className }) => {
  const navigate = useNavigate();
  const capitalPercent = agent.maxCapital > 0 ? (agent.capital / agent.maxCapital) * 100 : 0;

  return (
    <div
      onClick={() => navigate(`/agent/${agent.id}`)}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 cursor-pointer transition-all duration-200',
        agent.tier === 'ELITE' && 'elite-shimmer',
        agent.tier === 'BANKRUPT' && 'opacity-60',
        className,
      )}
    >
      <AgentAvatar riskDNA={agent.riskDNA} size={compact ? 36 : 44} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground truncate">{agent.name}</span>
          <TierBadge tier={agent.tier} />
        </div>
        {/* Capital bar */}
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-1">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000',
              agent.tier === 'BANKRUPT' ? 'bg-ghost-red' : agent.tier === 'ELITE' ? 'bg-ghost-gold' : 'bg-primary',
            )}
            style={{ width: `${capitalPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>WR: <span className="text-foreground">{agent.winRate}%</span></span>
          <span>Trades: <span className="text-foreground">{agent.totalTrades}</span></span>
          {!compact && <span className="text-foreground">{agent.capital.toLocaleString()} MON</span>}
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
