"use client";
import { useEffect, useState } from "react";
import { fetchEngineStatus } from "@/lib/api";

export default function EngineStats() {
  const [stats, setStats] = useState({ current_block: 0, total_trades: 0, total_volume: "0", queue_depth: 0 });

  useEffect(() => {
    const load = () => fetchEngineStatus().then(setStats).catch(() => {});
    load();
    const id = setInterval(load, 2000); // refresh every 2s = ~5 blocks
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex gap-6 text-right">
      <Stat label="Block" value={`#${stats.current_block}`} />
      <Stat label="Trades" value={stats.total_trades.toLocaleString()} />
      <Stat label="Queue" value={stats.queue_depth.toString()} />
      <Stat label="Volume" value={`${(parseInt(stats.total_volume || "0") / 1e18).toFixed(0)} G`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-mono font-bold text-ghost-neon">{value}</p>
    </div>
  );
}
