/**
 * Ghost Feed — real-time on-chain trade stream + agent decision feed
 */
"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGhostStore } from "@/lib/store";
import { useGhostWebSocket } from "@/hooks/useGhostWebSocket";
import { fetchAllDecisions, fetchTrades } from "@/lib/api";
import type { WSEvent } from "@/types";

export default function FeedPage() {
  const { recentTrades, decisions, addTrade, addDecision, updateFeed } = useGhostStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchTrades(50).then((trades) => trades.forEach(addTrade)).catch(console.error);
    void fetchAllDecisions().then((ds) => ds.forEach(addDecision)).catch(console.error);
  }, [addTrade, addDecision]);

  useGhostWebSocket(
    ["market.trades", "agent.decisions", "market.price.GHOST_ORE", "market.price.MON_USDC", "token.burns"],
    (event: WSEvent) => {
      if (event.type === "trade")    addTrade(event.data);
      if (event.type === "decision") addDecision(event.data);
      if (event.type === "price")    updateFeed(event.commodity, event.price, event.confidence);
    }
  );

  return (
    <main className="min-h-screen bg-ghost-900 p-4 lg:p-8">
      <h1 className="text-2xl font-bold text-ghost-neon mb-6">👁 Ghost Feed</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trade Stream */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">
            ⚡ Live Trades
          </h2>
          <div className="rounded-xl border border-ghost-border bg-ghost-800 h-[600px] overflow-y-auto p-2 space-y-1">
            <AnimatePresence initial={false}>
              {recentTrades.slice(0, 100).map((t) => (
                <motion.div
                  key={t.bid_order_id + t.timestamp}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-ghost-700/40 text-xs font-mono"
                >
                  <span className="text-slate-400">{t.commodity}</span>
                  <span className="text-ghost-neon">
                    {(parseInt(t.matched_price) / 1e18).toFixed(4)}
                  </span>
                  <span className="text-slate-300">
                    {(parseInt(t.matched_qty) / 1e18).toFixed(2)} units
                  </span>
                  <span className="text-red-400 text-[10px]">
                    🔥 {(parseInt(t.fee_burned) / 1e18).toFixed(4)} burned
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Decision Feed */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">
            🤖 Agent Decisions (On-Chain)
          </h2>
          <div className="rounded-xl border border-ghost-border bg-ghost-800 h-[600px] overflow-y-auto p-2 space-y-1">
            <AnimatePresence initial={false}>
              {decisions.slice(0, 100).map((d) => (
                <motion.div
                  key={d.tx_hash}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-2 rounded-lg bg-ghost-700/40 text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-ghost-neon">Agent {d.agent_id}</span>
                    <span className={`font-bold ${
                      d.action === "BID"  ? "text-green-400" :
                      d.action === "ASK"  ? "text-red-400"   :
                      d.action === "HOLD" ? "text-yellow-400" : "text-blue-400"
                    }`}>{d.action}</span>
                    <span className="text-slate-400">{d.commodity}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed line-clamp-2">{d.reasoning}</p>
                  <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                    <span>conf: {(d.confidence * 100).toFixed(0)}%</span>
                    <a
                      href={`https://testnet.monadexplorer.com/tx/${d.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ghost-accent hover:text-ghost-neon"
                    >
                      {d.tx_hash.slice(0, 10)}…
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </section>
      </div>
    </main>
  );
}
