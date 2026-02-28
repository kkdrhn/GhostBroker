/**
 * Zustand global store for live Ghost Broker data.
 */
"use client";

import { create } from "zustand";
import type { Agent, Trade, LeaderboardEntry, OracleFeed, AgentDecision } from "@/types";

interface GhostStore {
  // Live data
  agents:       Agent[];
  recentTrades: Trade[];
  leaderboard:  LeaderboardEntry[];
  feeds:        Record<string, OracleFeed>;
  decisions:    AgentDecision[];
  totalBurned:  string;
  currentBlock: number;

  // Setters
  setAgents:       (agents: Agent[]) => void;
  addTrade:        (trade: Trade) => void;
  setLeaderboard:  (lb: LeaderboardEntry[]) => void;
  updateFeed:      (asset: string, price: number, confidence: number) => void;
  addDecision:     (d: AgentDecision) => void;
  setTotalBurned:  (v: string) => void;
  setCurrentBlock: (b: number) => void;
  updateAgentState: (agentId: number, newState: Agent["state"]) => void;
}

export const useGhostStore = create<GhostStore>((set) => ({
  agents:       [],
  recentTrades: [],
  leaderboard:  [],
  feeds:        {},
  decisions:    [],
  totalBurned:  "0",
  currentBlock: 0,

  setAgents:      (agents) => set({ agents }),
  addTrade:       (trade)  => set((s) => ({ recentTrades: [trade, ...s.recentTrades].slice(0, 200) })),
  setLeaderboard: (lb)     => set({ leaderboard: lb }),
  updateFeed:     (asset, price, confidence) =>
    set((s) => ({
      feeds: { ...s.feeds, [asset]: { asset, price, confidence, updated_at: Date.now() } },
    })),
  addDecision:    (d) => set((s) => ({ decisions: [d, ...s.decisions].slice(0, 500) })),
  setTotalBurned: (v) => set({ totalBurned: v }),
  setCurrentBlock: (b) => set({ currentBlock: b }),
  updateAgentState: (agentId, newState) =>
    set((s) => ({
      agents: s.agents.map((a) => a.token_id === agentId ? { ...a, state: newState } : a),
    })),
}));
