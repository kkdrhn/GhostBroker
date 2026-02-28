import React, { useState } from 'react';
import type { Decision } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MONADSCAN_TX } from '@/config/chain';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DecisionTableProps {
  decisions: Decision[];
  className?: string;
}

const actionColors: Record<string, string> = {
  BID: 'text-ghost-green',
  ASK: 'text-ghost-red',
  HOLD: 'text-muted-foreground',
  PARTNER: 'text-ghost-cyan',
};

const DecisionTable: React.FC<DecisionTableProps> = ({ decisions, className }) => {
  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-[10px] font-bold tracking-wider">BLOCK</TableHead>
            <TableHead className="text-[10px] font-bold tracking-wider">ACTION</TableHead>
            <TableHead className="text-[10px] font-bold tracking-wider">ASSET</TableHead>
            <TableHead className="text-[10px] font-bold tracking-wider text-right">PRICE</TableHead>
            <TableHead className="text-[10px] font-bold tracking-wider text-right">QTY</TableHead>
            <TableHead className="text-[10px] font-bold tracking-wider">REASONING</TableHead>
            <TableHead className="text-[10px] font-bold tracking-wider text-right">CONF%</TableHead>
            <TableHead className="text-[10px] font-bold tracking-wider">TX</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decisions.map((d) => (
            <TableRow key={d.id} className="border-border text-xs">
              <TableCell className="font-mono text-muted-foreground">{d.block}</TableCell>
              <TableCell className={cn('font-bold', actionColors[d.action])}>{d.action}</TableCell>
              <TableCell className="text-foreground">{d.asset}</TableCell>
              <TableCell className="text-right font-mono">{d.price.toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">{d.quantity}</TableCell>
              <TableCell className="max-w-[200px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground truncate block cursor-help">{d.reasoning}</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm text-xs bg-card border-border">
                    {d.reasoning}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="text-right">
                <span className={cn('font-bold', d.confidence >= 80 ? 'text-ghost-green' : d.confidence >= 60 ? 'text-ghost-gold' : 'text-ghost-red')}>
                  {d.confidence}%
                </span>
              </TableCell>
              <TableCell>
                <a
                  href={MONADSCAN_TX(d.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-[10px]"
                >
                  {d.txHash.slice(0, 8)}...
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DecisionTable;
