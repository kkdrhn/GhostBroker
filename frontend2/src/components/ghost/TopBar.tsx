import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useGhostStore } from '@/store';
import { Button } from '@/components/ui/button';
import BlockCounter from '@/components/ghost/BlockCounter';

const navLinks = [
  { path: '/',            label: 'HOME' },
  { path: '/arena',       label: 'ARENA' },
  { path: '/mint',        label: 'MINT' },
  { path: '/market',      label: 'MARKET' },
  { path: '/stake',       label: 'STAKE' },
  { path: '/leaderboard', label: 'RANKS' },
  { path: '/portfolio',   label: 'PORTFOLIO' },
];

const TopBar: React.FC = () => {
  const location = useLocation();
  const { isConnected, walletAddress, ghostBalance, setWallet, disconnect } = useGhostStore();

  // Minimal stub — real impl uses wagmi useConnect/useDisconnect
  const handleConnect = () => {
    // TODO: replace with wagmi connect modal
    const mockAddr = '0x7a3b...4f2e';
    setWallet(mockAddr, '12450500000000000000000');
  };

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
          {/* Live block counter — fed from WS chain.block events */}
          <BlockCounter />

          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-ghost-gold font-bold">
                {(Number(BigInt(ghostBalance) / BigInt('1000000000000000000'))).toLocaleString()} GHOST
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
                className="text-[10px] h-7 border-border"
              >
                {walletAddress}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={handleConnect} className="text-[10px] h-7">
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
