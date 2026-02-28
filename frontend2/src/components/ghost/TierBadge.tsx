import React from 'react';
import type { AgentTier } from '@/types';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: AgentTier;
  className?: string;
}

const tierConfig: Record<AgentTier, { label: string; classes: string }> = {
  ACTIVE: { label: 'ACTIVE', classes: 'bg-ghost-green/20 text-ghost-green border-ghost-green/40 pulse-green' },
  ELITE: { label: 'ELITE', classes: 'bg-ghost-gold/20 text-ghost-gold border-ghost-gold/40 pulse-gold' },
  BANKRUPT: { label: 'BANKRUPT', classes: 'bg-ghost-red/20 text-ghost-red border-ghost-red/40' },
  REVIVED: { label: 'REVIVED', classes: 'bg-ghost-cyan/20 text-ghost-cyan border-ghost-cyan/40' },
};

const TierBadge: React.FC<TierBadgeProps> = ({ tier, className }) => {
  const config = tierConfig[tier];
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider border rounded-sm uppercase',
      config.classes,
      className,
    )}>
      {config.label}
    </span>
  );
};

export default TierBadge;
