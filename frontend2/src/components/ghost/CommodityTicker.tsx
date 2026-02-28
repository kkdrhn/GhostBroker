import React from 'react';
import type { CommodityPrice } from '@/types';
import { cn } from '@/lib/utils';

interface CommodityTickerProps {
  data: CommodityPrice;
  className?: string;
}

const Sparkline: React.FC<{ data: number[]; color: string; width?: number; height?: number }> = ({
  data, color, width = 80, height = 24,
}) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
};

const CommodityTicker: React.FC<CommodityTickerProps> = ({ data, className }) => {
  const isPositive = data.change24h >= 0;
  return (
    <div className={cn('flex items-center justify-between p-3 rounded-lg border border-border bg-card', className)}>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground font-bold tracking-wider">{data.label}</div>
        <div className="text-lg font-bold text-foreground">{data.price.toFixed(4)}</div>
        <div className={cn('text-xs font-semibold', isPositive ? 'text-ghost-green' : 'text-ghost-red')}>
          {isPositive ? '▲' : '▼'} {Math.abs(data.change24h).toFixed(1)}%
        </div>
      </div>
      <Sparkline
        data={data.history}
        color={isPositive ? 'hsl(142, 72%, 50%)' : 'hsl(0, 72%, 51%)'}
      />
    </div>
  );
};

export default CommodityTicker;
