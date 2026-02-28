

# Ghost Broker — Cyberpunk Trading Terminal

Full frontend build with mock data, ready for real contract integration later. Built on React + Vite + React Router (equivalent to your Next.js spec).

## Foundation & Theme
- Dark-only cyberpunk terminal theme: background `#0A0A0F`, accent purple `#7C3AED`
- JetBrains Mono font throughout
- Install viem, wagmi, RainbowKit, Framer Motion, Zustand, lightweight-charts
- Monad Testnet chain config (Chain ID 10143)
- Wallet connect button with RainbowKit (MetaMask + Phantom)
- Global top bar: block counter, TPS meter, wallet button, GHOST balance
- Navigation across all routes

## Reusable Components
- **AgentCard** — avatar, tier badge, capital bar, win-rate
- **AgentAvatar** — deterministic SVG generated from risk DNA parameters
- **TierBadge** — ACTIVE (green pulse), ELITE (gold glow), BANKRUPT (red), REVIVED (cyan)
- **LiveFeed** — auto-scrolling trade stream with pause-on-hover
- **CommodityTicker** — price display with sparkline mini-charts
- **BlockCounter** — animated live block number display
- **GhostOrderBook** — depth visualization with green bids / red asks
- **StakePanel** — approve → stake two-step flow
- **RiskDNASlider** — interactive configurator for minting
- **CapitalChart** — TradingView Lightweight Charts wrapper
- **DecisionTable** — on-chain decision log table
- **LifecycleTimeline** — bankruptcy/revival/partnership event timeline

## Pages

### `/` — Landing Page
- "Ghost Arena" hero section with glowing title and tagline
- Live agent ticker scrolling across the screen
- CTA buttons to enter Arena or Mint an agent

### `/arena` — Ghost Arena Dashboard
- 3-column layout: agent list | trade feed | commodity prices
- Left: scrollable agent cards with status badges and capital bars
- Center: real-time "Ghost Feed" trade stream, color-coded entries
- Right: commodity price board (GHOST_ORE, PHANTOM_GAS, VOID_CHIP, MON/USDC) with sparklines
- Top bar with block counter + TPS

### `/mint` — BrokerAgent NFT Mint
- Risk DNA sliders: Risk Appetite (0-100), Strategy toggle, Starting Capital input, Agent Name
- Live SVG avatar preview that morphs based on slider values
- Mint button with gas estimate display
- Success: confetti animation + redirect to agent detail

### `/agent/:id` — Agent Detail
- Header with avatar, name, tier badge, owner address
- **Performance tab**: capital chart, stats grid, open orders
- **Decision Log tab**: on-chain decisions table with expandable reasoning
- **Stakers tab**: staker list with earnings, claim button
- Lifecycle timeline at bottom

### `/stake` — Stake Interface
- Searchable agent grid sorted by reputation
- Agent stats preview on selection
- Stake input with yield estimate
- Approve → Stake two-step flow
- Current stakes table with unstake buttons

### `/market` — Ghost Market
- Split view: order book (bids/asks with depth bars) + trade history
- Commodity selector tabs
- Manual order placement panel
- WebSocket connection status indicator

### `/leaderboard` — Agent Rankings
- Sortable table with all agent stats
- Tier filter tabs
- ELITE rows with gold shimmer animation
- Click to navigate to agent detail

### `/portfolio` — User Portfolio
- User's owned agents list
- Staking positions with earnings
- Total portfolio value and P&L summary

## Animation & UX
- Framer Motion for all transitions: fade-in data updates, count-up numbers
- Green flash on new trades, shake animation on bankruptcy, gold particles on elite promotion
- Skeleton loading states everywhere (no spinners)
- Terminal-style red error messages
- Responsive: desktop-first, tablet drawer for side panels, mobile single-column

## Data Strategy
- All pages use realistic mock data with proper types/interfaces
- Hooks structured for easy swap to real contracts (useAgentDecisions, useAgentList, etc.)
- Zustand store for global state (connected wallet, selected agent, feed data)
- Mock WebSocket simulation for live feed updates

