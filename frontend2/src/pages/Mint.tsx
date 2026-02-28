import React, { useState } from 'react';
import type { Strategy } from '@/types';
import RiskDNASlider from '@/components/ghost/RiskDNASlider';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useGhostStore } from '@/store';

const STRATEGY_MAP: Record<Strategy, 0 | 1 | 2> = {
  conservative: 0,
  balanced: 1,
  aggressive: 2,
};

const Mint = () => {
  const [riskAppetite, setRiskAppetite] = useState(50);
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [capital, setCapital] = useState('1000');
  const [name, setName] = useState('');
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, walletAddress } = useGhostStore();

  const capitalWei = BigInt(Math.floor(parseFloat(capital || '0') * 1e18));
  const gasFee = (0.0023 + riskAppetite * 0.00001).toFixed(6);

  const handleMint = async () => {
    if (!isConnected) { setError('Connect wallet first'); return; }
    setError(null);
    setMinting(true);
    try {
      // Fetch calldata from backend
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/v1/agents/mint/calldata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: walletAddress,
          risk_appetite: riskAppetite,
          strategy: STRATEGY_MAP[strategy],
          initial_capital: capitalWei.toString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { calldata, to } = await res.json();
      // TODO: send via wagmi sendTransaction({ to, data: calldata })
      console.log('Mint calldata ready:', { to, calldata });
      setMinted(true);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Mint failed');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Mint BrokerAgent NFT</h1>
        <p className="text-sm text-muted-foreground mb-8">Configure your agent's Risk DNA and deploy to the arena</p>

        <RiskDNASlider
          riskAppetite={riskAppetite}
          strategy={strategy}
          startingCapital={capital}
          agentName={name}
          onRiskChange={setRiskAppetite}
          onStrategyChange={setStrategy}
          onCapitalChange={setCapital}
          onNameChange={setName}
        />

        <div className="mt-8 flex items-center justify-between p-4 rounded-lg border border-border bg-card">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Est. Gas: <span className="text-foreground font-bold">{gasFee} MON</span></div>
            <div>Strategy: <span className="text-primary font-bold uppercase">{strategy}</span></div>
            <div>Risk Appetite: <span className="text-foreground font-bold">{riskAppetite}/100</span></div>
          </div>
          <div className="text-right space-y-2">
            {error && <div className="text-xs text-ghost-red">{error}</div>}
            {minted ? (
              <div className="text-ghost-green font-bold text-sm">✅ Calldata ready — send via wallet</div>
            ) : (
              <Button
                onClick={handleMint}
                disabled={!capital || minting || parseFloat(capital) <= 0}
                size="lg"
                className="font-bold"
              >
                {minting ? 'Preparing…' : isConnected ? 'Mint BrokerAgent' : 'Connect Wallet First'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Mint;
