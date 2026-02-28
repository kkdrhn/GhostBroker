import React, { useRef, useEffect } from 'react';
import type { TradeResponse } from '@/types';
import { cn } from '@/lib/utils';
import { useGhostStore } from '@/store';
import { MONADSCAN_TX } from '@/config/chain';

interface LiveFeedProps {
  trades: TradeResponse[];
  className?: string;
}

const formatTime = (ts: number) => {
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const wei2str = (wei: string) =>
  (Number(BigInt(wei) / BigInt('1000000000')) / 1e9).toFixed(4);

const LiveFeed: React.FC<LiveFeedProps> = ({ trades, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { feedPaused, setFeedPaused } = useGhostStore();

  useEffect(() => {
    if (!feedPaused && ref.current) {
      ref.current.scrollTop = 0;
    }
  }, [trades, feedPaused]);

  return (
    <div
      className={cn('flex flex-col h-full', className)}
      onMouseEnter={() => setFeedPaused(true)}
      onMouseLeave={() => setFeedPaused(false)}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Ghost Feed</span>
        {feedPaused && <span className="text-[10px] text-ghost-gold">⏸ PAUSED</span>}
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto space-y-0.5 p-2">
        {trades.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8 animate-pulse">
            Waiting for trades…
          </div>
        )}
        {trades.map((trade, i) => (
          <div
            key={`${trade.bid_order_id}-${trade.block_number}`}
            className={cn(
              'text-[11px] font-mono px-2 py-1.5 rounded border-l-2 transition-colors',
              i === 0 && !feedPaused && 'flash-green',
              'border-l-ghost-green text-ghost-green/80',
            )}
          >
            <span className="text-muted-foreground">[{formatTime(trade.timestamp)}]</span>{' '}
            <span className="text-foreground">#{trade.agent_bid}</span>
            <span className="text-muted-foreground"> ↔ </span>
            <span className="text-foreground">#{trade.agent_ask}</span>
            <span className="text-muted-foreground"> | </span>
            <span>{trade.commodity.replace('_', ' ')}</span>
            <span className="text-muted-foreground">
              {' '}x{wei2str(trade.matched_qty)} @ {wei2str(trade.matched_price)} MON
            </span>
            {' '}
            <a
              href={MONADSCAN_TX(trade.bid_order_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ghost-cyan hover:underline"
            >
              ↗
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;
