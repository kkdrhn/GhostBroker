import React, { useState } from 'react';
import type { Strategy } from '@/types';
import RiskDNASlider from '@/components/ghost/RiskDNASlider';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useGhostStore } from '@/store';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const STRATEGY_LABEL: Record<Strategy, string> = {
  conservative: 'CONSERVATIVE',
  balanced: 'BALANCED',
  aggressive: 'AGGRESSIVE',
};

const Mint = () => {
  const [riskAppetite, setRiskAppetite] = useState(50);
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [capital, setCapital] = useState('1000');
  const [name, setName] = useState('');
  const [minting, setMinting] = useState(false);
  const [mintedAgent, setMintedAgent] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cüzdan — store veya window.ethereum
  const { walletAddress, setWallet } = useGhostStore();

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask bulunamadı. Lütfen MetaMask yükleyin.');
      return;
    }
    try {
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts[0]) setWallet(accounts[0], '0');
    } catch {
      setError('Cüzdan bağlantısı reddedildi.');
    }
  };

  const handleCreate = async () => {
    if (!walletAddress) { setError('Önce cüzdan bağla'); return; }
    if (!capital || parseFloat(capital) <= 0) { setError('Geçerli bir sermaye gir'); return; }
    setError(null);
    setMinting(true);
    try {
      const res = await fetch(`${API}/v1/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: walletAddress,
          name: name.trim() || undefined,
          risk_appetite: riskAppetite,
          strategy: STRATEGY_LABEL[strategy],
          initial_capital: parseFloat(capital),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? 'Ajan oluşturulamadı');
      }
      const agent = await res.json();
      setMintedAgent({ id: agent.token_id, name: agent.name });
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Hata');
    } finally {
      setMinting(false);
    }
  };

  const isConnected = !!walletAddress;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Yeni Ajan Oluştur</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Risk DNA'sını ayarla — ajan otomatik olarak arena'da trade etmeye başlayacak
        </p>

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
            <div>Strateji: <span className="text-primary font-bold uppercase">{strategy}</span></div>
            <div>Risk İştahı: <span className="text-foreground font-bold">{riskAppetite}/100</span></div>
            <div>Başlangıç Sermayesi: <span className="text-foreground font-bold">{capital} MON</span></div>
            {walletAddress && (
              <div>Sahip: <span className="text-foreground font-mono text-[10px]">{walletAddress.slice(0,6)}…{walletAddress.slice(-4)}</span></div>
            )}
          </div>
          <div className="text-right space-y-2">
            {error && <div className="text-xs text-red-400">{error}</div>}
            {mintedAgent ? (
              <div className="space-y-2 text-right">
                <div className="text-green-400 font-bold text-sm">
                  ✅ Ajan oluşturuldu: <span className="text-primary">#{mintedAgent.id} {mintedAgent.name}</span>
                </div>
                <div className="flex gap-2 justify-end">
                  <Link to="/arena">
                    <Button size="sm" variant="outline">Arena'ya Git</Button>
                  </Link>
                  <Button size="sm" onClick={() => { setMintedAgent(null); setName(''); }}>
                    Yeni Ajan
                  </Button>
                </div>
              </div>
            ) : !isConnected ? (
              <Button onClick={connectWallet} size="lg" variant="outline" className="font-bold border-primary/50 text-primary">
                Cüzdan Bağla
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={!capital || minting || parseFloat(capital) <= 0}
                size="lg"
                className="font-bold"
              >
                {minting ? 'Oluşturuluyor…' : 'Ajan Oluştur'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Mint;
