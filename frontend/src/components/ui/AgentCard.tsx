/**
 * AgentCard — renders a BrokerAgent NFT with lifecycle state animation
 */
"use client";

import { motion } from "framer-motion";
import type { Agent } from "@/types";
import { formatEther } from "viem";

const STATE_STYLES: Record<Agent["state"], { border: string; glow: string; label: string; emoji: string }> = {
  ACTIVE:   { border: "border-ghost-accent", glow: "glow-purple", label: "Active",   emoji: "⚡" },
  ELITE:    { border: "border-ghost-gold",   glow: "glow-gold",   label: "Elite",    emoji: "👑" },
  BANKRUPT: { border: "border-ghost-red",    glow: "glow-red",    label: "Bankrupt", emoji: "💀" },
  REVIVED:  { border: "border-ghost-green",  glow: "glow-green",  label: "Revived",  emoji: "🔄" },
};

const STRATEGY_COLOR: Record<Agent["strategy"], string> = {
  AGGRESSIVE:   "text-red-400",
  BALANCED:     "text-blue-400",
  CONSERVATIVE: "text-green-400",
};

export default function AgentCard({ agent }: { agent: Agent }) {
  const style  = STATE_STYLES[agent.state];
  const winRate = agent.win_count + agent.loss_count > 0
    ? ((agent.win_count / (agent.win_count + agent.loss_count)) * 100).toFixed(1)
    : "—";

  const capitalFormatted = (() => {
    try { return parseFloat(formatEther(BigInt(agent.capital))).toFixed(2); }
    catch { return "—"; }
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`
        relative rounded-xl border ${style.border} ${style.glow}
        bg-ghost-800 p-4 cursor-pointer transition-all
      `}
    >
      {/* State badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-mono">
        <span>{style.emoji}</span>
        <span className="opacity-80">{style.label}</span>
      </div>

      {/* Agent ID */}
      <p className="text-xs text-slate-500 font-mono">Agent #{agent.token_id}</p>
      <h3 className={`mt-1 font-bold ${STRATEGY_COLOR[agent.strategy]}`}>
        {agent.strategy}
      </h3>

      {/* Risk appetite bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Risk Appetite</span>
          <span>{agent.risk_appetite}/100</span>
        </div>
        <div className="h-1.5 bg-ghost-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-ghost-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${agent.risk_appetite}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Capital */}
      <div className="mt-3 flex justify-between">
        <span className="text-xs text-slate-400">Capital</span>
        <span className="text-sm font-mono font-semibold text-ghost-neon">
          {capitalFormatted} GHOST
        </span>
      </div>

      {/* Win / Loss */}
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>W/L</span>
        <span>
          <span className="text-green-400">{agent.win_count}W</span>
          {" / "}
          <span className="text-red-400">{agent.loss_count}L</span>
          {" — "}
          <span className="text-slate-300">{winRate}%</span>
        </span>
      </div>

      {/* Score */}
      {agent.score != null && (
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-slate-400">Score</span>
          <span className="text-ghost-gold font-mono">{agent.score} / 10000</span>
        </div>
      )}

      {/* Bankrupt overlay */}
      {agent.state === "BANKRUPT" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-xl bg-red-950/40 flex items-center justify-center backdrop-blur-[1px]"
        >
          <span className="text-red-400 font-bold text-lg">BANKRUPT</span>
        </motion.div>
      )}
    </motion.div>
  );
}
