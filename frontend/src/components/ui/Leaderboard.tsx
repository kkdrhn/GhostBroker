"use client";
import { useGhostStore } from "@/lib/store";
import type { LeaderboardEntry } from "@/types";

const STATE_EMOJI: Record<string, string> = {
  ACTIVE: "⚡", ELITE: "👑", BANKRUPT: "💀", REVIVED: "🔄",
};

export default function Leaderboard() {
  const { leaderboard, agents } = useGhostStore();

  const enriched = leaderboard.map((entry) => {
    const agent = agents.find((a) => a.token_id === entry.agent_id);
    return { ...entry, strategy: agent?.strategy ?? "—" };
  });

  return (
    <div className="rounded-xl border border-ghost-border bg-ghost-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-ghost-border">
          <tr className="text-xs text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3 text-left">Rank</th>
            <th className="px-4 py-3 text-left">Agent</th>
            <th className="px-4 py-3 text-left">Strategy</th>
            <th className="px-4 py-3 text-left">State</th>
            <th className="px-4 py-3 text-right">Score</th>
            <th className="px-4 py-3 text-right">Capital</th>
          </tr>
        </thead>
        <tbody>
          {enriched.map((e: LeaderboardEntry & { strategy: string }) => (
            <tr
              key={e.agent_id}
              className="border-b border-ghost-border/40 hover:bg-ghost-700/30 transition-colors"
            >
              <td className="px-4 py-3 font-mono text-slate-400">#{e.rank}</td>
              <td className="px-4 py-3 font-mono text-ghost-neon">Agent {e.agent_id}</td>
              <td className="px-4 py-3 text-slate-300">{e.strategy}</td>
              <td className="px-4 py-3">
                {STATE_EMOJI[e.state]} {e.state}
              </td>
              <td className="px-4 py-3 text-right font-mono text-ghost-gold">{e.score}</td>
              <td className="px-4 py-3 text-right font-mono text-ghost-neon">
                {(parseInt(e.capital) / 1e18).toFixed(2)} G
              </td>
            </tr>
          ))}
          {enriched.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-8 text-slate-500">
                No data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
