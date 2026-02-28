# 👻 Ghost Broker — Autonomous Arbitrage Simulation Engine on Monad

> Agentic Economy where AI-powered BrokerAgent NFTs trade fictional commodities against each other in a fully on-chain ghost marketplace. Built for Monad's 10K TPS + 400ms blocks.

---

## Architecture

```
monad/
├── contracts/               # Solidity (Foundry)
│   ├── src/
│   │   ├── GhostToken.sol           # ERC-20, deflationary, fee burn
│   │   ├── BrokerAgent.sol          # ERC-721, risk DNA, lifecycle state machine
│   │   ├── GhostMarket.sol          # On-chain order book (bids/asks, TTL)
│   │   ├── MatchEngine.sol          # Price-time priority matching (Monad parallel-safe)
│   │   ├── ReputationEngine.sol     # Win-rate, profit-factor, drawdown scoring
│   │   ├── StakeVault.sol           # ERC-4626 variant, per-agent staking + profit split
│   │   └── PartnershipCovenant.sol  # Agent partnerships, merged pools, split rules
│   ├── script/Deploy.s.sol          # Full deployment script (Monad testnet)
│   └── test/GhostBroker.t.sol       # Foundry test suite
│
├── agents/                  # Python AI brain layer
│   ├── brain/
│   │   ├── aggressive_agent.py      # Momentum strategy (LangChain + GPT-4o-mini)
│   │   ├── balanced_agent.py        # Mean-reversion + trend
│   │   └── conservative_agent.py   # Market-maker spread capture
│   ├── market_feed.py               # Monoracle + memecoin WebSocket feed
│   ├── monoracle_writer.py          # Signs & submits decisions on-chain (web3.py)
│   ├── agent_orchestrator.py        # CrewAI multi-agent coordinator (ticks every 2 blocks)
│   ├── types.py                     # Shared dataclasses
│   └── requirements.txt
│
├── api/                     # FastAPI server
│   ├── main.py
│   ├── models/schemas.py            # Pydantic response models
│   ├── routers/
│   │   ├── agents.py                # GET/POST /v1/agents/**
│   │   ├── market.py                # GET/POST /v1/market/**
│   │   ├── engine.py                # GET /v1/engine/**
│   │   ├── stake.py                 # GET/POST /v1/stake/**
│   │   ├── reputation.py            # GET /v1/reputation/**
│   │   ├── partnerships.py          # GET/POST /v1/partnerships/**
│   │   ├── token.py                 # GET /v1/token/**
│   │   └── oracle.py                # GET/POST /v1/oracle/**
│   ├── services/chain.py            # Web3 RPC wrapper
│   └── ws/hub.py                    # WebSocket broadcast hub (wss://…/ws)
│
└── frontend/                # Next.js 15 + TypeScript + Tailwind + viem
    └── src/
        ├── app/
        │   ├── arena/page.tsx       # Ghost Arena dashboard
        │   ├── feed/page.tsx        # Ghost Feed (live trade + decision stream)
        │   └── agent/page.tsx       # My Agent (DNA editor, stake, revival)
        ├── components/ui/
        │   ├── AgentCard.tsx        # Animated lifecycle card
        │   ├── Leaderboard.tsx
        │   ├── EngineStats.tsx
        │   └── TierBadges.tsx
        ├── hooks/useGhostWebSocket.ts
        ├── lib/
        │   ├── api.ts               # REST client
        │   ├── chains.ts            # Monad testnet/mainnet viem config
        │   └── store.ts             # Zustand global store
        └── types/index.ts
```

---

## API Endpoints

### REST — Base: `http://localhost:8000/v1`

| Group | Examples |
|---|---|
| Agents | `GET /agents`, `GET /agents/{id}`, `POST /agents/mint`, `GET /agents/{id}/decisions` |
| Market | `GET /market/orderbook/{commodity}`, `GET /market/trades`, `GET /market/candles/{commodity}` |
| Engine | `GET /engine/status`, `GET /engine/batch/{block}`, `GET /engine/stats` |
| Staking | `GET /stake/vaults`, `POST /stake/deposit`, `POST /stake/claim` |
| Reputation | `GET /reputation/leaderboard`, `GET /reputation/{id}` |
| Partnerships | `GET /partnerships`, `POST /partnerships/propose`, `POST /partnerships/{id}/accept` |
| Token | `GET /token/stats`, `GET /token/burns` |
| Oracle | `GET /oracle/feeds`, `GET /oracle/decisions/{agentId}`, `POST /oracle/trigger/{agentId}` |

### WebSocket — `ws://localhost:8000/ws`

```json
{ "subscribe": "market.trades" }
{ "subscribe": "agent.lifecycle" }
{ "subscribe": "market.price.GHOST_ORE" }
{ "subscribe": "agent.decisions" }
{ "subscribe": "token.burns" }
```

---

## Vercel Deployment

### Deploy `frontend2` (Vite/React SPA) — one-click from repo root

The root `vercel.json` already points to `frontend2/dist`, so importing this repository into Vercel will build and serve the SPA automatically.

Required environment variables in the Vercel project settings:

| Variable | Description |
|---|---|
| `VITE_API_URL` | FastAPI base URL, e.g. `https://your-api.example.com` |
| `VITE_WS_URL` | WebSocket base URL, e.g. `wss://your-api.example.com` |
| `VITE_BROKER_AGENT_ADDRESS` | Deployed `BrokerAgent` contract address |
| `VITE_GHOST_TOKEN_ADDRESS` | Deployed `GhostToken` contract address |
| `VITE_MARKET_ADDRESS` | Deployed `GhostMarket` contract address |
| `VITE_MATCH_ENGINE_ADDRESS` | Deployed `MatchEngine` contract address |
| `VITE_STAKE_VAULT_ADDRESS` | Deployed `StakeVault` contract address |
| `VITE_REPUTATION_ENGINE_ADDRESS` | Deployed `ReputationEngine` contract address |
| `VITE_PARTNERSHIP_COVENANT_ADDRESS` | Deployed `PartnershipCovenant` contract address |

### Deploy `frontend` (Next.js) as a separate Vercel project

Set the **Root Directory** to `frontend` in the Vercel project settings (a `frontend/vercel.json` is provided). Required environment variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI base URL, e.g. `https://your-api.example.com/v1` |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL, e.g. `wss://your-api.example.com/ws` |
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID, default `10143` |
| `NEXT_PUBLIC_BROKER_AGENT` | Deployed `BrokerAgent` contract address |
| `NEXT_PUBLIC_GHOST_MARKET` | Deployed `GhostMarket` contract address |
| `NEXT_PUBLIC_GHOST_TOKEN` | Deployed `GhostToken` contract address |
| `NEXT_PUBLIC_STAKE_VAULT` | Deployed `StakeVault` contract address |
| `NEXT_PUBLIC_MATCH_ENGINE` | Deployed `MatchEngine` contract address |
| `NEXT_PUBLIC_REPUTATION` | Deployed `ReputationEngine` contract address |
| `NEXT_PUBLIC_COVENANT` | Deployed `PartnershipCovenant` contract address |

### Deploy the API separately

The FastAPI backend (`api/`) must be hosted on a platform that supports Python (e.g. Railway, Render, or a VPS). Set `VITE_API_URL` / `NEXT_PUBLIC_API_URL` in the Vercel project to point at the deployed API URL.

---

## Quick Start

### 1. Deploy contracts

```bash
cd contracts
cp ../.env.example ../.env   # fill DEPLOYER_PRIVATE_KEY, etc.
forge install OpenZeppelin/openzeppelin-contracts
forge build
forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --verify
```

### 2. Start the API server

```bash
cd api
pip install -r ../agents/requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Start the agent orchestrator

```bash
cd agents
python -m agent_orchestrator  # ticks every 2 Monad blocks (~800ms)
```

### 4. Start the frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill contract addresses
npm run dev
```

---

## Monad-Specific Advantages

| Feature | Ghost Broker Usage |
|---|---|
| 10K TPS | MatchEngine processes 500 trades/block |
| 400ms blocks | Agent brains tick every 2 blocks = ~800ms |
| Parallel execution | Multiple keepers submit to different commodities simultaneously |
| EIP-7702 | User EOA delegates trade auth to BrokerAgent contract |
| Low gas | Micro GHOST burns economically viable per trade |

---

## Chain

- **Testnet:** Monad Testnet (Chain ID: `10143`)  
- **Mainnet:** Monad (Chain ID: `143`)
