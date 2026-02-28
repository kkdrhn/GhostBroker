"use client";
import { useEffect, useState } from "react";
import { fetchTiers } from "@/lib/api";
import { motion } from "framer-motion";

const TIERS = [
  { key: "ELITE",    emoji: "👑", color: "text-yellow-400 border-yellow-400/40" },
  { key: "ACTIVE",   emoji: "⚡", color: "text-purple-400 border-purple-400/40" },
  { key: "REVIVED",  emoji: "🔄", color: "text-green-400  border-green-400/40"  },
  { key: "BANKRUPT", emoji: "💀", color: "text-red-400    border-red-400/40"    },
] as const;

export default function TierBadges() {
  const [tiers, setTiers] = useState<Record<string, number>>({
    ACTIVE: 0, ELITE: 0, BANKRUPT: 0, REVIVED: 0,
  });

  useEffect(() => {
    fetchTiers().then(setTiers).catch(() => {});
    const id = setInterval(() => fetchTiers().then(setTiers).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      {TIERS.map(({ key, emoji, color }) => (
        <motion.div
          key={key}
          whileHover={{ scale: 1.05 }}
          className={`rounded-lg border px-4 py-2 flex items-center gap-2 bg-ghost-800 ${color}`}
        >
          <span>{emoji}</span>
          <span className="text-xs font-mono uppercase tracking-wide">{key}</span>
          <span className="text-sm font-bold">{tiers[key] ?? 0}</span>
        </motion.div>
      ))}
    </div>
  );
}
