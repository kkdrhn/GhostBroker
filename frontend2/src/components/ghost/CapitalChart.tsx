import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, AreaSeries } from 'lightweight-charts';
import { cn } from '@/lib/utils';

interface CapitalChartProps {
  data: { time: number; value: number }[];
  className?: string;
}

const CapitalChart: React.FC<CapitalChartProps> = ({ data, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(240, 8%, 50%)',
        fontFamily: 'JetBrains Mono',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'hsl(240, 15%, 12%)' },
        horzLines: { color: 'hsl(240, 15%, 12%)' },
      },
      width: containerRef.current.clientWidth,
      height: 300,
      rightPriceScale: { borderColor: 'hsl(240, 15%, 16%)' },
      timeScale: { borderColor: 'hsl(240, 15%, 16%)' },
      crosshair: {
        vertLine: { color: 'hsl(263, 84%, 58%)', width: 1, style: 2 },
        horzLine: { color: 'hsl(263, 84%, 58%)', width: 1, style: 2 },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      topColor: 'hsla(263, 84%, 58%, 0.4)',
      bottomColor: 'hsla(263, 84%, 58%, 0.0)',
      lineColor: 'hsl(263, 84%, 58%)',
      lineWidth: 2,
    });

    series.setData(data as any);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return <div ref={containerRef} className={cn('w-full', className)} />;
};

export default CapitalChart;
