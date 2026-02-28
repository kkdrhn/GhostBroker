import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL:         process.env.NEXT_PUBLIC_API_URL         ?? "http://localhost:8000/v1",
    NEXT_PUBLIC_WS_URL:          process.env.NEXT_PUBLIC_WS_URL          ?? "ws://localhost:8000/ws",
    NEXT_PUBLIC_CHAIN_ID:        process.env.NEXT_PUBLIC_CHAIN_ID        ?? "10143",
    NEXT_PUBLIC_BROKER_AGENT:    process.env.NEXT_PUBLIC_BROKER_AGENT    ?? "",
    NEXT_PUBLIC_GHOST_MARKET:    process.env.NEXT_PUBLIC_GHOST_MARKET    ?? "",
    NEXT_PUBLIC_GHOST_TOKEN:     process.env.NEXT_PUBLIC_GHOST_TOKEN     ?? "",
    NEXT_PUBLIC_STAKE_VAULT:     process.env.NEXT_PUBLIC_STAKE_VAULT     ?? "",
    NEXT_PUBLIC_MATCH_ENGINE:    process.env.NEXT_PUBLIC_MATCH_ENGINE    ?? "",
    NEXT_PUBLIC_REPUTATION:      process.env.NEXT_PUBLIC_REPUTATION      ?? "",
    NEXT_PUBLIC_COVENANT:        process.env.NEXT_PUBLIC_COVENANT        ?? "",
  },
};

export default nextConfig;
