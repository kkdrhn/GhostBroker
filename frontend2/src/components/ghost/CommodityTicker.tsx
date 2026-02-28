import React from 'react';
import type { CommodityPrice } from '@/types';
import { useGhostStore } from '@/store';
import { cn } from '@/lib/utils';

interface CommodityTickerProps {
  data: CommodityPrice;
  className?: string;
}

const Sparkline: React.FC<{ data: number[]; color: string; width?: number; height?: number }> = ({
  data, color, width = 80, height = 28,
}) => {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className="shrink-0 opacity-30">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={points} />
    </svg>
  );
};

const CommodityTicker: React.FC<CommodityTickerProps> = ({ data, className }) => {
  const history = useGhostStore((s) => s.priceHistory[data.commodity] ?? data.history ?? []);

  const derivedChange = history.length >= 2
    ? ((history[history.length - 1] - history[0]) / history[0]) * 100
    : data.change24h;
  const isPositive = derivedChange >= 0;
  const sparkColor = isPositive ? 'hsl(142, 72%, 50%)' : 'hsl(0, 72%, 51%)';

  const priceStr = data.price >= 100
    ? data.price.toFixed(2)
    : data.price >= 1
    ? data.price.toFixed(4)
    : data.price.toFixed(6);

  return (
    <div className={cn('flex items-center justify-between p-3 rounded-lg border border-border bg-card gap-2', className)}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs text-muted-foreground font-bold tracking-wider uppercase">{data.label}</span>
          <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-ghost-cyan font-mono">MON</span>
        </div>
        <div className="text-lg font-bold text-foreground font-mono">{priceStr}</div>
        <div className={cn('text-xs font-semibold', isPositive ? 'text-green-400' : 'text-red-400')}>
          {isPositive ? '▲' : '▼'} {Math.abs(derivedChange).toFixed(2)}%
        </div>
      </div>
      <Sparkline data={history} color={sparkColor} />
    </div>
  );
};

export default CommodityTicker;
