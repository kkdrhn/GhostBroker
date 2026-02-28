import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AgentDecisionResponse, TradeResponse } from '@/types';
import { cn } from '@/lib/utils';
import { useGhostStore } from '@/store';

interface LiveFeedProps {
  trades: TradeResponse[];
  className?: string;
}

type Tab = 'decisions' | 'trades';

interface PagedResult {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: Record<string, unknown>[];
}

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const PAGE_SIZE = 25;

const formatTime = (ts: number) => {
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  return d.toLocaleTimeString('tr-TR', { hour12: false });
};

const ACTION_STYLE: Record<string, string> = {
  BID:     'border-l-green-500 text-green-400',
  ASK:     'border-l-red-500  text-red-400',
  HOLD:    'border-l-yellow-500 text-yellow-400',
  PARTNER: 'border-l-purple-500 text-purple-400',
};
const ACTION_ICON: Record<string, string> = {
  BID: '▲', ASK: '▼', HOLD: '⏸', PARTNER: '🤝',
};

const ConfBar = ({ conf }: { conf: number }) => {
  const pct    = Math.round((conf ?? 0) * 100);
  const filled = Math.round((conf ?? 0) * 8);
  return (
    <span className="text-ghost-cyan font-mono text-[10px]">
      {'█'.repeat(filled)}{'░'.repeat(8 - filled)} {pct}%
    </span>
  );
};

const DecisionRow: React.FC<{ d: Record<string, unknown>; fresh?: boolean }> = ({ d, fresh }) => {
  const action = String(d.action ?? '').toUpperCase();
  const price  = parseFloat(String(d.price ?? 0));
  const qty    = parseFloat(String(d.qty   ?? 0));
  const conf   = parseFloat(String(d.confidence ?? 0));
  const style  = ACTION_STYLE[action] ?? 'border-l-ghost-cyan text-ghost-cyan';
  return (
    <div className={cn('text-[11px] font-mono px-2 py-2 rounded border-l-2 mb-1 transition-all', style, fresh && 'bg-white/5')}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{formatTime(Number(d.timestamp ?? 0))}</span>
        <span className="text-foreground font-bold">{String(d.agent_name ?? d.name ?? `#${d.agent_id}`)}</span>
        {d.strategy && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-muted-foreground uppercase">{String(d.strategy)}</span>
        )}
        <span className="ml-auto font-bold tracking-wider">{ACTION_ICON[action] ?? '·'} {action}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <span className="text-foreground">{String(d.commodity ?? '—')}</span>
        {qty > 0 && price > 0 && (
          <><span>@ {price >= 1 ? price.toFixed(4) : price.toFixed(6)}</span><span>×</span><span>{qty.toFixed(6)}</span></>
        )}
        <span className="ml-auto"><ConfBar conf={conf} /></span>
      </div>
      {d.reasoning && (
        <div className="text-[10px] text-muted-foreground leading-tight italic">💬 {String(d.reasoning)}</div>
      )}
    </div>
  );
};

const TradeRow: React.FC<{ t: Record<string, unknown>; fresh?: boolean }> = ({ t, fresh }) => {
  const side  = String(t.side ?? 'BID').toUpperCase();
  const name  = String(t.agent_name ?? `#${t.agent_id}`);
  const comm  = String(t.commodity ?? '—');
  const price = parseFloat(String(t.price ?? 0));
  const qty   = parseFloat(String(t.qty   ?? 0));
  const ts    = Number(t.timestamp ?? 0);
  const isBid = side === 'BID';
  return (
    <div className={cn('text-[11px] font-mono px-2 py-2 rounded border-l-2 mb-0.5', fresh && 'bg-white/5', isBid ? 'border-l-green-500' : 'border-l-red-500')}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{formatTime(ts)}</span>
        <span className={cn('font-bold', isBid ? 'text-green-400' : 'text-red-400')}>{isBid ? '▲' : '▼'} {side}</span>
        <span className="text-foreground font-semibold">{name}</span>
        <span className="ml-auto font-bold text-ghost-cyan">{comm}</span>
      </div>
      {price > 0 && (
        <div className="text-muted-foreground mt-0.5 flex gap-2">
          <span className="text-foreground">{price >= 1 ? price.toFixed(4) : price.toFixed(6)}</span>
          {qty > 0 && <><span>×</span><span>{qty.toFixed(6)}</span></>}
          {price > 0 && qty > 0 && <span className="ml-auto text-ghost-gold font-bold">≈ {(price * qty).toFixed(4)} MON</span>}
        </div>
      )}
    </div>
  );
};

const Pager: React.FC<{
  page: number; total_pages: number; total: number;
  onPrev: () => void; onNext: () => void;
}> = ({ page, total_pages, total, onPrev, onNext }) => (
  <div className="flex items-center justify-between px-2 py-1.5 border-t border-border shrink-0">
    <span className="text-[10px] text-muted-foreground font-mono">{total} kayıt · s.{page}/{total_pages}</span>
    <div className="flex gap-1">
      <button onClick={onPrev} disabled={page <= 1}
        className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground disabled:opacity-30 hover:bg-white/10">‹</button>
      <button onClick={onNext} disabled={page >= total_pages}
        className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground disabled:opacity-30 hover:bg-white/10">›</button>
    </div>
  </div>
);

const LiveFeed: React.FC<LiveFeedProps> = ({ trades: wsTrades, className }) => {
  const { decisions: wsDecisions } = useGhostStore();
  const [tab, setTab] = useState<Tab>('decisions');

  const [decPage, setDecPage]         = useState(1);
  const [decData, setDecData]         = useState<PagedResult | null>(null);
  const [decLoading, setDecLoading]   = useState(false);

  const [tradePage, setTradePage]         = useState(1);
  const [tradeData, setTradeData]         = useState<PagedResult | null>(null);
  const [tradeLoading, setTradeLoading]   = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchDecisions = useCallback(async (page: number) => {
    setDecLoading(true);
    try {
      const res = await fetch(`${API}/v1/market/decisions?limit=${PAGE_SIZE}&page=${page}`);
      if (res.ok) setDecData(await res.json());
    } catch { /* ignore */ } finally { setDecLoading(false); }
  }, []);

  const fetchTrades = useCallback(async (page: number) => {
    setTradeLoading(true);
    try {
      const res = await fetch(`${API}/v1/market/trades?limit=${PAGE_SIZE}&page=${page}`);
      if (res.ok) setTradeData(await res.json());
    } catch { /* ignore */ } finally { setTradeLoading(false); }
  }, []);

  // WS'den yeni veri gelince sayfa-1'i tazele
  useEffect(() => {
    if (tab === 'decisions' && decPage === 1) fetchDecisions(1);
  }, [wsDecisions.length]); // eslint-disable-line

  useEffect(() => {
    if (tab === 'trades' && tradePage === 1) fetchTrades(1);
  }, [wsTrades.length]); // eslint-disable-line

  // Tab değişince reset
  useEffect(() => {
    setDecPage(1); setTradePage(1);
    if (tab === 'decisions') fetchDecisions(1);
    else fetchTrades(1);
  }, [tab]); // eslint-disable-line

  useEffect(() => { fetchDecisions(decPage); scrollRef.current?.scrollTo({ top: 0 }); }, [decPage]); // eslint-disable-line
  useEffect(() => { fetchTrades(tradePage); scrollRef.current?.scrollTo({ top: 0 }); }, [tradePage]); // eslint-disable-line

  const decItems   = decData?.items   ?? wsDecisions.map(d => d as unknown as Record<string, unknown>);
  const tradeItems = tradeData?.items ?? wsTrades.map(t => t as unknown as Record<string, unknown>);
  const decTotal   = decData?.total       ?? wsDecisions.length;
  const decTotalP  = decData?.total_pages ?? 1;
  const trTotal    = tradeData?.total       ?? wsTrades.length;
  const trTotalP   = tradeData?.total_pages ?? 1;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Tab Bar */}
      <div className="flex items-center border-b border-border px-3 py-0 shrink-0">
        {(['decisions', 'trades'] as Tab[]).map((t) => {
          const isActive = tab === t;
          const count    = t === 'decisions' ? decTotal : trTotal;
          const color    = t === 'decisions' ? 'text-ghost-cyan border-ghost-cyan' : 'text-ghost-green border-ghost-green';
          return (
            <button key={t} onClick={() => setTab(t)}
              className={cn('text-xs font-bold tracking-wider uppercase py-2 px-3 border-b-2 transition-colors',
                isActive ? color : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t === 'decisions' ? '🤖 Decision Log' : '⚡ Trade Feed'}
              {count > 0 && (
                <span className={cn('ml-1 text-[9px] px-1 py-0.5 rounded', t === 'decisions' ? 'bg-ghost-cyan/20 text-ghost-cyan' : 'bg-ghost-green/20 text-ghost-green')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 min-h-0">
        {tab === 'decisions' && (
          <>
            {decLoading && decItems.length === 0 && <div className="text-xs text-center py-8 text-muted-foreground animate-pulse">Yükleniyor…</div>}
            {!decLoading && decItems.length === 0 && <div className="text-xs text-center py-12 text-muted-foreground">Henüz karar yok. AI tick bekleniyor (~20s)…</div>}
            {decItems.map((d, i) => <DecisionRow key={`d-${i}`} d={d} fresh={i === 0 && decPage === 1} />)}
          </>
        )}
        {tab === 'trades' && (
          <>
            {tradeLoading && tradeItems.length === 0 && <div className="text-xs text-center py-8 text-muted-foreground animate-pulse">Yükleniyor…</div>}
            {!tradeLoading && tradeItems.length === 0 && <div className="text-xs text-center py-12 text-muted-foreground">Henüz trade yok. BID/ASK bekleniyor…</div>}
            {tradeItems.map((t, i) => <TradeRow key={`t-${i}`} t={t} fresh={i === 0 && tradePage === 1} />)}
          </>
        )}
      </div>

      {/* Pagination */}
      {tab === 'decisions' && decTotal > PAGE_SIZE && (
        <Pager page={decPage} total_pages={decTotalP} total={decTotal} onPrev={() => setDecPage(p => p - 1)} onNext={() => setDecPage(p => p + 1)} />
      )}
      {tab === 'trades' && trTotal > PAGE_SIZE && (
        <Pager page={tradePage} total_pages={trTotalP} total={trTotal} onPrev={() => setTradePage(p => p - 1)} onNext={() => setTradePage(p => p + 1)} />
      )}
    </div>
  );
};

export default LiveFeed;
