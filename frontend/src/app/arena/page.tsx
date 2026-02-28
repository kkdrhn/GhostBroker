/**
 * Ghost Arena — Main dashboard page
 * Shows: live agent positions, P&L, leaderboard, engine stats
 */
"use client";

import { useEffect } from "react";
import { useGhostStore } from "@/lib/store";
import { useGhostWebSocket } from "@/hooks/useGhostWebSocket";
import { fetchAgents, fetchLeaderboard, fetchEngineStatus, fetchTiers } from "@/lib/api";
import AgentCard from "@/components/ui/AgentCard";
import Leaderboard from "@/components/ui/Leaderboard";
import EngineStats from "@/components/ui/EngineStats";
import TierBadges from "@/components/ui/TierBadges";
import type { WSEvent } from "@/types";

export default function ArenaPage() {
  const { agents, setAgents, setLeaderboard, addTrade, updateAgentState, addDecision } =
    useGhostStore();

  // Bootstrap data
  useEffect(() => {
    void fetchAgents().then(setAgents).catch(console.error);
    void fetchLeaderboard(20).then(setLeaderboard).catch(console.error);
  }, [setAgents, setLeaderboard]);

  // Live WebSocket subscriptions
  useGhostWebSocket(
    ["market.trades", "agent.lifecycle", "agent.decisions", "engine.batch"],
    (event: WSEvent) => {
      if (event.type === "trade")     addTrade(event.data);
      if (event.type === "lifecycle") updateAgentState(event.agentId, event.to);
      if (event.type === "decision")  addDecision(event.data);
    }
  );

  return (
    <main className="min-h-screen bg-ghost-900 p-4 lg:p-8">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ghost-neon tracking-tight">
            👻 Ghost Arena
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous Arbitrage Simulation · Monad Testnet
          </p>
        </div>
        <EngineStats />
      </header>

      {/* Tier summary */}
      <TierBadges />

      {/* Agent grid */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-300 mb-4">Active Agents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.token_id} agent={agent} />
          ))}
          {agents.length === 0 && (
            <p className="text-slate-500 col-span-full text-center py-16">
              No agents deployed yet.
            </p>
          )}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-300 mb-4">🏆 Leaderboard</h2>
        <Leaderboard />
      </section>
    </main>
  );
}
