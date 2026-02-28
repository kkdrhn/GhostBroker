/**
 * My Agent — risk DNA editor, stake allocation, revival interface
 */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { fetchAgents, fetchVaults, fetchRewards } from "@/lib/api";
import { useEffect } from "react";
import type { Agent, Vault } from "@/types";

export default function MyAgentPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors }  = useConnect();
  const { disconnect }           = useDisconnect();

  const [myAgents,  setMyAgents]  = useState<Agent[]>([]);
  const [vaults,    setVaults]    = useState<Vault[]>([]);
  const [rewards,   setRewards]   = useState({ claimable: "0", claimed: "0" });
  const [activeTab, setActiveTab] = useState<"dna" | "stake" | "revive">("dna");

  // DNA mint form
  const [dnaForm, setDnaForm] = useState({ riskAppetite: 50, strategy: "BALANCED", capital: "" });

  useEffect(() => {
    if (!address) return;
    void fetchAgents().then((all) => setMyAgents(all.filter((a) => a.owner_address.toLowerCase() === address.toLowerCase())));
    void fetchVaults().then(setVaults);
    void fetchRewards(address).then(setRewards);
  }, [address]);

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-ghost-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-6">👻 Connect to manage your Agent</p>
          {connectors.map((c) => (
            <button
              key={c.id}
              onClick={() => connect({ connector: c })}
              className="px-6 py-3 rounded-xl bg-ghost-accent text-white font-semibold hover:bg-ghost-neon transition-colors mr-2"
            >
              {c.name}
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ghost-900 p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-ghost-neon">🎭 My Agent</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-slate-400">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
          <button
            onClick={() => disconnect()}
            className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 px-3 py-1 rounded-lg"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["dna", "stake", "revive"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-ghost-accent text-white"
                : "bg-ghost-800 text-slate-400 hover:text-white"
            }`}
          >
            {tab === "dna" ? "🧬 Risk DNA" : tab === "stake" ? "💎 Stake" : "🔄 Revive"}
          </button>
        ))}
      </div>

      {/* DNA Editor */}
      {activeTab === "dna" && (
        <div className="rounded-xl border border-ghost-border bg-ghost-800 p-6 max-w-lg">
          <h2 className="text-lg font-semibold mb-4">Deploy a New BrokerAgent</h2>

          <label className="block mb-4">
            <span className="text-xs text-slate-400 uppercase tracking-wide">
              Risk Appetite: {dnaForm.riskAppetite}/100
            </span>
            <input
              type="range" min={0} max={100}
              value={dnaForm.riskAppetite}
              onChange={(e) => setDnaForm((f) => ({ ...f, riskAppetite: parseInt(e.target.value) }))}
              className="w-full mt-2 accent-ghost-accent"
            />
          </label>

          <label className="block mb-4">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Strategy</span>
            <select
              value={dnaForm.strategy}
              onChange={(e) => setDnaForm((f) => ({ ...f, strategy: e.target.value }))}
              className="w-full mt-2 bg-ghost-700 border border-ghost-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="AGGRESSIVE">Aggressive</option>
              <option value="BALANCED">Balanced</option>
              <option value="CONSERVATIVE">Conservative</option>
            </select>
          </label>

          <label className="block mb-6">
            <span className="text-xs text-slate-400 uppercase tracking-wide">
              Initial Capital (GHOST)
            </span>
            <input
              type="number" min={0}
              value={dnaForm.capital}
              onChange={(e) => setDnaForm((f) => ({ ...f, capital: e.target.value }))}
              placeholder="e.g. 1000"
              className="w-full mt-2 bg-ghost-700 border border-ghost-border rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <motion.button
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl bg-ghost-accent font-semibold hover:bg-ghost-neon transition-colors"
          >
            🚀 Mint BrokerAgent NFT
          </motion.button>
        </div>
      )}

      {/* Stake */}
      {activeTab === "stake" && (
        <div className="space-y-4 max-w-2xl">
          <div className="rounded-xl border border-ghost-border bg-ghost-800 p-4 flex justify-between items-center">
            <span className="text-slate-400 text-sm">Claimable Rewards</span>
            <span className="text-ghost-gold font-mono font-bold">
              {(parseInt(rewards.claimable) / 1e18).toFixed(4)} GHOST
            </span>
          </div>
          {vaults.map((v) => (
            <div key={v.agent_id} className="rounded-xl border border-ghost-border bg-ghost-800 p-4">
              <div className="flex justify-between mb-2">
                <span className="font-mono text-ghost-neon">Agent #{v.agent_id}</span>
                <span className="text-xs text-ghost-gold">APY ×{v.apy_multiplier / 100}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>TVL: {(parseInt(v.total_deposited) / 1e18).toFixed(2)} GHOST</span>
                <span>Rewards: {(parseInt(v.total_rewards) / 1e18).toFixed(4)} GHOST</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revival */}
      {activeTab === "revive" && (
        <div className="max-w-lg">
          <p className="text-slate-400 mb-4 text-sm">
            Bankrupt agents are locked. Pay the revival fee to restore them with new capital.
          </p>
          {myAgents.filter((a) => a.state === "BANKRUPT").map((a) => (
            <div key={a.token_id} className="rounded-xl border border-red-500/40 bg-ghost-800 p-4 mb-3">
              <p className="font-mono text-red-400 mb-3">Agent #{a.token_id} — BANKRUPT</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-semibold transition-colors"
              >
                🔄 Revive (100 GHOST fee)
              </motion.button>
            </div>
          ))}
          {myAgents.filter((a) => a.state === "BANKRUPT").length === 0 && (
            <p className="text-slate-500 text-center py-12">No bankrupt agents 🎉</p>
          )}
        </div>
      )}
    </main>
  );
}
