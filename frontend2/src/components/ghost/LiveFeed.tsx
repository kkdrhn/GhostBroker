import React, { useRef, useEffect, useState } from 'react';
import type { TradeResponse, AgentDecisionResponse } from '@/types';
import { cn } from '@/lib/utils';
import { useGhostStore } from '@/store';

interface LiveFeedProps {
  trades: TradeResponse[];
  className?: string;
}

type Tab = 'decisions' | 'trades';

const formatTime = (ts: number) => {
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  return d.toLocaleTimeString('tr-TR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const ACTION_STYLE: Record<string, string> = {
  BID:     'border-l-green-500 text-green-400',
  ASK:     'border-l-red-500 text-red-400',
  HOLD:    'border-l-yellow-500 text-yellow-400',
  PARTNER: 'border-l-purple-500 text-purple-400',
};

const ACTION_ICON: Record<string, string> = {
  BID:     '▲',
  ASK:     '▼',
  HOLD:    '⏸',
  PARTNER: '🤝',
};

const CONFIDENCE_BAR = (conf: number) => {
  const pct = Math.round(conf * 100);
  const filled = Math.round(conf * 8);
  return `${'█'.repeat(filled)}${'░'.repeat(8 - filled)} ${pct}%`;
};

const DecisionRow: React.FC<{ d: AgentDecisionResponse; isNew: boolean }> = ({ d, isNew }) => {
  const action = String(d.action).toUpperCase();
  const price  = typeof d.price === 'number' ? d.price : parseFloat(String(d.price)) || 0;
  const qty    = typeof d.qty === 'number' ? d.qty : parseFloat(String(d.qty)) || 0;
  const style  = ACTION_STYLE[action] ?? 'border-l-ghost-cyan text-ghost-cyan';

  return (
    <div className={cn(
      'text-[11px] font-mono px-2 py-2 rounded border-l-2 mb-1 transition-all',
      style,
      isNew && 'bg-white/5',
    )}>
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{formatTime(d.timestamp)}</span>
        <span className="text-foreground font-bold">{d.name ?? `Agent #${d.agent_id}`}</span>
        {d.strategy && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-muted-foreground uppercase">
            {d.strategy}
          </span>
        )}
        <span className="ml-auto font-bold tracking-wider">
          {ACTION_ICON[action] ?? '·'} {action}
        </span>
      </div>
      {/* Market row */}
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <span className="text-foreground">{d.commodity}</span>
        {qty > 0 && price > 0 && (
          <>
            <span>@ {price >= 1 ? price.toFixed(4) : price.toFixed(6)}</span>
            <span>×</span>
            <span>{qty.toFixed(6)}</span>
          </>
        )}
        <span className="ml-auto text-[10px] text-ghost-cyan font-mono">
          {CONFIDENCE_BAR(d.confidence)}
        </span>
      </div>
      {/* Reasoning */}
      <div className="text-[10px] text-muted-foreground leading-tight italic">
        💬 {d.reasoning}
      </div>
    </div>
  );
};

const LiveFeed: React.FC<LiveFeedProps> = ({ trades, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { feedPaused, setFeedPaused, decisions } = useGhostStore();
  const [tab, setTab] = useState<Tab>('decisions');

  useEffect(() => {
    if (!feedPaused && ref.current) {
      ref.current.scrollTop = 0;
    }
  }, [decisions, trades, feedPaused]);

  return (
    <div
      className={cn('flex flex-col h-full', className)}
      onMouseEnter={() => setFeedPaused(true)}
      onMouseLeave={() => setFeedPaused(false)}
    >
      {/* Tab bar */}
      <div className="flex items-center border-b border-border px-3 py-0 shrink-0">
        <button
          onClick={() => setTab('decisions')}
          className={cn(
            'text-xs font-bold tracking-wider uppercase py-2 px-3 border-b-2 transition-colors',
            tab === 'decisions'
              ? 'border-ghost-cyan text-ghost-cyan'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          🤖 Decision Log
          {decisions.length > 0 && (
            <span className="ml-1 text-[9px] bg-ghost-cyan/20 text-ghost-cyan px-1 py-0.5 rounded">
              {decisions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('trades')}
          className={cn(
            'text-xs font-bold tracking-wider uppercase py-2 px-3 border-b-2 transition-colors',
            tab === 'trades'
              ? 'border-ghost-green text-ghost-green'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          ⚡ Trade Feed
        </button>
        {feedPaused && (
          <span className="ml-auto text-[10px] text-ghost-gold">⏸ PAUSED</span>
        )}
      </div>

      <div ref={ref} className="flex-1 overflow-y-auto p-2">
        {/* ── Decision Log Tab ── */}
        {tab === 'decisions' && (
          <>
            {decisions.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-12 animate-pulse">
                Waiting for AI decisions…
              </div>
            )}
            {decisions.map((d, i) => (
              <DecisionRow
                key={`${d.agent_id}-${d.timestamp}-${i}`}
                d={d}
                isNew={i === 0 && !feedPaused}
              />
            ))}
          </>
        )}

        {/* ── Trade Feed Tab ── */}
        {tab === 'trades' && (
          <>
            {trades.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-12 animate-pulse">
                Waiting for trades…
              </div>
            )}
            {trades.map((trade, i) => {
              // AI trade payload veya match engine payload — ikisini de destekle
              const t = trade as unknown as Record<string, unknown>;
              const side    = String(t['side'] ?? (t['agent_bid'] ? 'BID' : 'ASK')).toUpperCase();
              const name    = String(t['agent_name'] ?? (t['agent_bid'] ? `#${t['agent_bid']}↔#${t['agent_ask']}` : `#${t['agent_id']}`));
              const comm    = String(t['commodity'] ?? '—');
              const price   = parseFloat(String(t['price'] ?? t['matched_price'] ?? 0));
              const qty     = parseFloat(String(t['qty'] ?? t['matched_qty'] ?? 0));
              const ts      = Number(t['timestamp'] ?? t['block_number'] ?? 0);
              const isBid   = side === 'BID';
              return (
                <div
                  key={`trade-${i}-${ts}`}
                  className={cn(
                    'text-[11px] font-mono px-2 py-2 rounded border-l-2 mb-0.5 transition-colors',
                    i === 0 && !feedPaused && 'bg-white/5',
                    isBid ? 'border-l-green-500' : 'border-l-red-500',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{formatTime(ts)}</span>
                    <span className={cn('font-bold', isBid ? 'text-green-400' : 'text-red-400')}>
                      {isBid ? '▲' : '▼'} {side}
                    </span>
                    <span className="text-foreground font-semibold">{name}</span>
                    <span className="ml-auto font-bold text-ghost-cyan">{comm}</span>
                  </div>
                  {price > 0 && (
                    <div className="text-muted-foreground mt-0.5 flex gap-2">
                      <span className="text-foreground">{price >= 1 ? price.toFixed(4) : price.toFixed(6)}</span>
                      {qty > 0 && <><span>×</span><span>{qty.toFixed(6)}</span></>}
                      {price > 0 && qty > 0 && (
                        <span className="ml-auto text-ghost-gold font-mono font-bold">
                          ≈ {(price * qty).toFixed(4)} MON
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default LiveFeed;

