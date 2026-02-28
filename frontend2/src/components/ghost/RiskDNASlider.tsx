import React from 'react';
import type { Strategy } from '@/types';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import AgentAvatar from './AgentAvatar';
import { cn } from '@/lib/utils';

interface RiskDNASliderProps {
  riskAppetite: number;
  strategy: Strategy;
  startingCapital: string;
  agentName: string;
  onRiskChange: (v: number) => void;
  onStrategyChange: (s: Strategy) => void;
  onCapitalChange: (v: string) => void;
  onNameChange: (v: string) => void;
  className?: string;
}

const strategies: Strategy[] = ['aggressive', 'balanced', 'conservative'];

const RiskDNASlider: React.FC<RiskDNASliderProps> = ({
  riskAppetite, strategy, startingCapital, agentName,
  onRiskChange, onStrategyChange, onCapitalChange, onNameChange,
  className,
}) => {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-8', className)}>
      {/* Controls */}
      <div className="space-y-6">
        <div>
          <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-3 block">
            Risk Appetite
          </label>
          <Slider
            value={[riskAppetite]}
            onValueChange={([v]) => onRiskChange(v)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Conservative</span>
            <span className="text-foreground font-bold text-sm">{riskAppetite}</span>
            <span>Aggressive</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-3 block">
            Strategy
          </label>
          <div className="flex gap-2">
            {strategies.map((s) => (
              <button
                key={s}
                onClick={() => onStrategyChange(s)}
                className={cn(
                  'flex-1 py-2 px-3 text-xs font-bold rounded-md border transition-all capitalize',
                  strategy === s
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-border bg-muted text-muted-foreground hover:border-primary/50',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-2 block">
            Starting Capital (MON)
          </label>
          <Input
            type="number"
            value={startingCapital}
            onChange={(e) => onCapitalChange(e.target.value)}
            placeholder="1000"
            className="bg-muted border-border"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-2 block">
            Agent Name
          </label>
          <Input
            value={agentName}
            onChange={(e) => onNameChange(e.target.value.slice(0, 20))}
            placeholder="GhostAgent_001"
            maxLength={20}
            className="bg-muted border-border"
          />
          <div className="text-[10px] text-muted-foreground mt-1 text-right">{agentName.length}/20</div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-border bg-muted/30">
        <div className="text-xs text-muted-foreground tracking-wider uppercase mb-4">Live Preview</div>
        <AgentAvatar
          riskDNA={{ riskAppetite, strategy, startingCapital: parseFloat(startingCapital) || 0 }}
          size={160}
        />
        <div className="mt-4 text-center">
          <div className="text-lg font-bold text-foreground">{agentName || 'Unnamed Agent'}</div>
          <div className="text-xs text-muted-foreground capitalize mt-1">{strategy} • Risk {riskAppetite}/100</div>
        </div>
      </div>
    </div>
  );
};

export default RiskDNASlider;
