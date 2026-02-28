import React from 'react';
import type { OrderBookEntry } from '@/types';
import { cn } from '@/lib/utils';

interface GhostOrderBookProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  className?: string;
}

const GhostOrderBook: React.FC<GhostOrderBookProps> = ({ bids, asks, className }) => {
  const maxQty = Math.max(...bids.map(b => b.quantity), ...asks.map(a => a.quantity));

  const Row: React.FC<{ entry: OrderBookEntry; side: 'bid' | 'ask' }> = ({ entry, side }) => {
    const pct = (entry.quantity / maxQty) * 100;
    return (
      <div className="relative flex items-center text-[11px] font-mono px-2 py-0.5">
        <div
          className={cn(
            'absolute inset-y-0 opacity-15',
            side === 'bid' ? 'right-0 bg-ghost-green' : 'left-0 bg-ghost-red',
          )}
          style={{ width: `${pct}%` }}
        />
        <span className={cn('w-20 text-right relative z-10', side === 'bid' ? 'text-ghost-green' : 'text-ghost-red')}>
          {entry.price.toFixed(4)}
        </span>
        <span className="w-16 text-right text-foreground relative z-10">{entry.quantity}</span>
        <span className="w-20 text-right text-muted-foreground relative z-10">{entry.total.toFixed(2)}</span>
      </div>
    );
  };

  return (
    <div className={cn('border border-border rounded-lg bg-card overflow-hidden', className)}>
      <div className="flex items-center px-3 py-2 border-b border-border">
        <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Order Book</span>
      </div>
      {/* Header */}
      <div className="flex items-center text-[10px] text-muted-foreground font-bold px-2 py-1 border-b border-border">
        <span className="w-20 text-right">PRICE</span>
        <span className="w-16 text-right">QTY</span>
        <span className="w-20 text-right">TOTAL</span>
      </div>
      {/* Asks (reversed so lowest ask is at bottom) */}
      <div className="border-b border-border">
        {[...asks].reverse().map((a, i) => <Row key={`ask-${i}`} entry={a} side="ask" />)}
      </div>
      {/* Spread */}
      <div className="text-center text-[10px] text-muted-foreground py-1 border-b border-border bg-muted/30">
        Spread: {(asks[0]?.price - bids[0]?.price).toFixed(4)}
      </div>
      {/* Bids */}
      <div>
        {bids.map((b, i) => <Row key={`bid-${i}`} entry={b} side="bid" />)}
      </div>
    </div>
  );
};

export default GhostOrderBook;
