import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Agent } from '@/types';
import { cn } from '@/lib/utils';

interface StakePanelProps {
  agent: Agent;
  className?: string;
}

type Step = 'input' | 'approving' | 'staking' | 'done';

const StakePanel: React.FC<StakePanelProps> = ({ agent, className }) => {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('input');

  const estimatedYield = amount ? (parseFloat(amount) * agent.apyMultiplier * 0.01).toFixed(2) : '0.00';

  const handleApprove = () => {
    setStep('approving');
    setTimeout(() => setStep('staking'), 1500);
  };

  const handleStake = () => {
    setStep('staking');
    setTimeout(() => setStep('done'), 1500);
  };

  return (
    <div className={cn('p-4 rounded-lg border border-border bg-card space-y-4', className)}>
      <div className="text-sm font-bold text-foreground">Stake on {agent.name}</div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Amount (GHOST)</label>
        <Input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={step !== 'input'}
          className="bg-muted border-border"
        />
        <div className="text-xs text-muted-foreground mt-1">
          Est. weekly yield: <span className="text-ghost-green">{estimatedYield} GHOST</span>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-[10px]">
        <div className={cn('flex items-center gap-1', step !== 'input' ? 'text-ghost-green' : 'text-muted-foreground')}>
          <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px]',
            step === 'approving' ? 'border-primary animate-spin' : step === 'input' ? 'border-muted-foreground' : 'border-ghost-green bg-ghost-green/20'
          )}>
            {step !== 'input' && step !== 'approving' ? '✓' : '1'}
          </div>
          APPROVE
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className={cn('flex items-center gap-1', step === 'done' ? 'text-ghost-green' : 'text-muted-foreground')}>
          <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px]',
            step === 'staking' ? 'border-primary animate-spin' : step === 'done' ? 'border-ghost-green bg-ghost-green/20' : 'border-muted-foreground'
          )}>
            {step === 'done' ? '✓' : '2'}
          </div>
          STAKE
        </div>
      </div>

      {step === 'input' && (
        <Button onClick={handleApprove} disabled={!amount || parseFloat(amount) <= 0} className="w-full">
          Approve GHOST
        </Button>
      )}
      {step === 'approving' && (
        <Button disabled className="w-full">Approving...</Button>
      )}
      {step === 'staking' && (
        <Button onClick={handleStake} className="w-full">Confirm Stake</Button>
      )}
      {step === 'done' && (
        <div className="text-center text-sm text-ghost-green font-bold">✅ Staked successfully!</div>
      )}
    </div>
  );
};

export default StakePanel;
