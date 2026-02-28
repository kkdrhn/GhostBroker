import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useGhostStore } from '@/store';
import { Button } from '@/components/ui/button';
import BlockCounter from '@/components/ghost/BlockCounter';

const navLinks = [
  { path: '/',            label: 'HOME' },
  { path: '/arena',       label: 'ARENA' },
  { path: '/mint',        label: 'MINT' },
  { path: '/leaderboard', label: 'RANKS' },
  { path: '/portfolio',   label: 'PORTFOLIO' },
];

const TopBar: React.FC = () => {
  const location = useLocation();
  const { isConnected, walletAddress, ghostBalance, setWallet, disconnect } = useGhostStore();

  // Sayfa açıldığında MetaMask'ta zaten bağlı hesap varsa otomatik yükle
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      const list = accounts as string[];
      if (list.length > 0) setWallet(list[0], '0');
    });
    const handler = (...args: unknown[]) => {
      const accs = args[0] as string[];
      if (accs.length > 0) setWallet(accs[0], '0');
      else disconnect();
    };
    window.ethereum.on('accountsChanged', handler);
    return () => window.ethereum?.removeListener('accountsChanged', handler);
  }, [setWallet, disconnect]);

  const handleConnect = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask bulunamadı. Lütfen MetaMask yükleyin.');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts[0]) setWallet(accounts[0], '0');
    } catch {
      // kullanıcı reddetti
    }
  };

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : '';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 h-12">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-primary">GHOST</span>
          <span className="text-sm font-bold text-foreground">BROKER</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'px-3 py-1.5 text-[11px] font-bold tracking-wider rounded-md transition-colors',
                location.pathname === link.path
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <BlockCounter />

          {isConnected ? (
            <div className="flex items-center gap-3">
              {ghostBalance !== '0' && (
                <span className="text-xs text-yellow-400 font-bold">
                  {(Number(BigInt(ghostBalance)) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} GHOST
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                className="text-[10px] h-7 border-border font-mono"
                title="Bağlantıyı kes"
              >
                {shortAddr}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={handleConnect} className="text-[10px] h-7">
              Cüzdan Bağla
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
