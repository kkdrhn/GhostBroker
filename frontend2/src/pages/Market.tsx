import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderBook, fetchTrades, fetchSpread } from '@/lib/api';
import { useGhostStore } from '@/store';
import { useGhostWS } from '@/lib/ws';
import GhostOrderBook from '@/components/ghost/GhostOrderBook';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Commodity, TradeResponse } from '@/types';

const COMMODITIES: Commodity[] = ['GHOST_ORE', 'PHANTOM_GAS', 'VOID_CHIP', 'MON_USDC'];
const wei2mon = (wei: string) => Number(BigInt(wei) / BigInt('1000000000')) / 1e9;
const formatTime = (ts: number) => new Date(ts > 1e12 ? ts : ts * 1000)
  .toLocaleTimeString('en-US', { hour12: false });

const Market = () => {
  const [selectedCommodity, setSelectedCommodity] = useState<Commodity>('GHOST_ORE');
  const { handleWSEvent, orderBooks } = useGhostStore();

  // WS: subscribe to orderbook channel
  useGhostWS({
    channels: ['market.orderbook', 'market.trades', 'oracle.prices', 'chain.block'],
    onEvent: handleWSEvent,
  });

  const { data: spread } = useQuery({
    queryKey: ['spread', selectedCommodity],
    queryFn: () => fetchSpread(selectedCommodity),
    refetchInterval: 2000,
  });

  // Fallback REST orderbook when WS not yet populated
  const { data: restBook } = useQuery({
    queryKey: ['orderbook', selectedCommodity],
    queryFn: () => fetchOrderBook(selectedCommodity),
    refetchInterval: 4000,
  });

  const { data: trades = [] } = useQuery<TradeResponse[]>({
    queryKey: ['trades', selectedCommodity],
    queryFn: () => fetchTrades(selectedCommodity, 30),
    refetchInterval: 4000,
  });

  // Prefer WS order book, fall back to REST
  const wsBook = orderBooks[selectedCommodity];
  const bids = wsBook?.bids ?? restBook?.bids?.map(o => ({
    price: wei2mon(o.price),
    quantity: wei2mon(o.qty),
    total: wei2mon(o.price) * wei2mon(o.qty),
  })) ?? [];
  const asks = wsBook?.asks ?? restBook?.asks?.map(o => ({
    price: wei2mon(o.price),
    quantity: wei2mon(o.qty),
    total: wei2mon(o.price) * wei2mon(o.qty),
  })) ?? [];

  const midPrice = spread?.mid_price ?? 0;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ghost Market</h1>
          <p className="text-sm text-muted-foreground">Live order book and trade history</p>
        </div>
        <div className="flex items-center gap-4">
          {spread && (
            <div className="text-xs font-mono text-muted-foreground">
              Mid: <span className="text-foreground font-bold">{midPrice.toFixed(4)}</span>
              {' '}Spread: <span className="text-ghost-gold">{spread.spread_pct.toFixed(3)}%</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-ghost-green pulse-green" />
            <span className="text-[10px] text-ghost-green font-bold">LIVE</span>
          </div>
        </div>
      </div>

      {/* Commodity tabs */}
      <div className="flex gap-2 mb-6">
        {COMMODITIES.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCommodity(c)}
            className={cn(
              'px-4 py-2 text-xs font-bold rounded-md border transition-all',
              selectedCommodity === c
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-muted text-muted-foreground hover:border-primary/50',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Book */}
        <div className="lg:col-span-1">
          <GhostOrderBook bids={bids} asks={asks} />
        </div>

        {/* Trade History */}
        <div className="lg:col-span-1 border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border text-xs font-bold text-muted-foreground tracking-wider uppercase">
            Trade History
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px]">TIME</TableHead>
                  <TableHead className="text-[10px] text-right">PRICE</TableHead>
                  <TableHead className="text-[10px] text-right">QTY</TableHead>
                  <TableHead className="text-[10px]">BLOCK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((t) => (
                  <TableRow key={`${t.bid_order_id}-${t.block_number}`} className="border-border text-xs">
                    <TableCell className="text-muted-foreground font-mono">
                      {formatTime(t.timestamp)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-ghost-green">
                      {wei2mon(t.matched_price).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{wei2mon(t.matched_qty).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground font-mono">{t.block_number}</TableCell>
                  </TableRow>
                ))}
                {trades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6 animate-pulse">
                      No trades yet…
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Place Order */}
        <div className="lg:col-span-1">
          <div className="border border-border rounded-lg p-4 bg-card space-y-4">
            <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Place Manual Order</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs border-ghost-green text-ghost-green hover:bg-ghost-green/10">BUY</Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs border-ghost-red text-ghost-red hover:bg-ghost-red/10">SELL</Button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Price (MON)</label>
              <Input type="number" placeholder={midPrice.toFixed(4)} className="bg-muted border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <Input type="number" placeholder="0" className="bg-muted border-border" />
            </div>
            <Button className="w-full font-bold">Submit Order</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Market;
