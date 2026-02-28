import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard, fetchAgent } from '@/lib/api';
import TierBadge from '@/components/ghost/TierBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types';

type SortKey = 'rank' | 'score' | 'capital';

const wei2mon = (wei: string) => Number(BigInt(wei) / BigInt('1000000000')) / 1e9;

const Leaderboard = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortKey>('rank');
  const [sortDesc, setSortDesc] = useState(false);

  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 50],
    queryFn: () => fetchLeaderboard(50),
  });

  const sorted = [...entries].sort((a, b) => {
    const av = sortBy === 'capital' ? wei2mon(a.capital) : a[sortBy];
    const bv = sortBy === 'capital' ? wei2mon(b.capital) : b[sortBy];
    return sortDesc ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDesc(!sortDesc);
    else { setSortBy(key); setSortDesc(key !== 'rank'); }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-foreground mb-1">Agent Rankings</h1>
      <p className="text-sm text-muted-foreground mb-6">Sorted by on-chain reputation score</p>

      {isLoading && (
        <div className="text-xs text-muted-foreground animate-pulse py-8 text-center">Loading leaderboard…</div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead
                className="text-[10px] w-12 cursor-pointer"
                onClick={() => toggleSort('rank')}
              >
                # {sortBy === 'rank' && (sortDesc ? '▼' : '▲')}
              </TableHead>
              <TableHead className="text-[10px]">AGENT</TableHead>
              <TableHead className="text-[10px]">TIER</TableHead>
              <TableHead
                className="text-[10px] text-right cursor-pointer"
                onClick={() => toggleSort('score')}
              >
                SCORE {sortBy === 'score' && (sortDesc ? '▼' : '▲')}
              </TableHead>
              <TableHead
                className="text-[10px] text-right cursor-pointer"
                onClick={() => toggleSort('capital')}
              >
                CAPITAL {sortBy === 'capital' && (sortDesc ? '▼' : '▲')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((entry) => (
              <TableRow
                key={entry.agent_id}
                onClick={() => navigate(`/agent/${entry.agent_id}`)}
                className={cn(
                  'border-border text-xs cursor-pointer hover:bg-muted/40',
                  entry.state === 'ELITE' && 'elite-shimmer',
                )}
              >
                <TableCell className="text-muted-foreground font-bold">{entry.rank}</TableCell>
                <TableCell>
                  <span className="font-bold text-foreground">Agent #{entry.agent_id}</span>
                </TableCell>
                <TableCell><TierBadge tier={entry.state} /></TableCell>
                <TableCell className="text-right font-mono">
                  <span className={cn(
                    entry.score >= 8000 ? 'text-ghost-gold' :
                    entry.score >= 5000 ? 'text-ghost-green' : 'text-foreground'
                  )}>
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/10000</span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {wei2mon(entry.capital).toLocaleString(undefined, { maximumFractionDigits: 0 })} MON
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                  No agents found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Leaderboard;
