"""
Ghost Broker — FastAPI Application entry point
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import agents, market, engine, stake, reputation, partnerships, token, oracle
from api.ws.hub import websocket_router, manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ghost_broker")

app = FastAPI(
    title="Ghost Broker API",
    version="1.0.0",
    description="Autonomous Arbitrage Simulation Engine on Monad",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST Routers ───────────────────────────────────────────────────────────────
app.include_router(agents.router,       prefix="/v1/agents",       tags=["Agents"])
app.include_router(market.router,       prefix="/v1/market",       tags=["Market"])
app.include_router(engine.router,       prefix="/v1/engine",       tags=["Match Engine"])
app.include_router(stake.router,        prefix="/v1/stake",        tags=["Staking"])
app.include_router(reputation.router,   prefix="/v1/reputation",   tags=["Reputation"])
app.include_router(partnerships.router, prefix="/v1/partnerships", tags=["Partnerships"])
app.include_router(token.router,        prefix="/v1/token",        tags=["GHOST Token"])
app.include_router(oracle.router,       prefix="/v1/oracle",       tags=["Oracle"])

# ── WebSocket Router ───────────────────────────────────────────────────────────
app.include_router(websocket_router)

STORE_PATH = Path(os.getenv("AGENT_STORE_PATH", "data/agents.json"))
COMMODITIES = ["ETH", "SOL", "MATIC", "BNB"]

# sys.path'e proje kökünü ekle (agents.* import için)
_root = Path(__file__).parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))


# ── Background: Fiyat ticki (CoinGecko) ───────────────────────────────────────
async def _price_ticker() -> None:
    """Her 30 saniyede CoinGecko'dan gerçek fiyatları çek, WS'e yayınla."""
    from api.routers.oracle import fetch_coingecko_prices, get_price

    # İlk fetch hemen
    await fetch_coingecko_prices()

    while True:
        try:
            await fetch_coingecko_prices()
            for commodity in COMMODITIES:
                price, conf = get_price(commodity)
                await manager.broadcast("oracle.prices", {
                    "type":       "price",
                    "commodity":  commodity,
                    "price":      price,
                    "confidence": conf,
                    "timestamp":  int(time.time()),
                })
            logger.info("Fiyatlar yayınlandı: %s", {c: get_price(c)[0] for c in COMMODITIES})
        except Exception as exc:
            logger.warning("Price ticker error: %s", exc)
        await asyncio.sleep(30)


# ── Background: Agent ticki (Gerçek Gemini AI) ────────────────────────────────
async def _agent_ticker() -> None:
    """Her 20 saniyede her agent için gerçek Gemini AI kararı üret."""
    from api.routers.oracle import get_price
    from agents.types import AgentDNA, MarketState, Strategy
    from agents.brain.aggressive_agent   import AggressiveAgent
    from agents.brain.balanced_agent     import BalancedAgent
    from agents.brain.conservative_agent import ConservativeAgent

    await asyncio.sleep(5)  # backend tam açılsın

    _brains: dict[int, AggressiveAgent | BalancedAgent | ConservativeAgent] = {}

    def _get_brain(agent_dict: dict):
        token_id = agent_dict["token_id"]
        strategy_str = agent_dict.get("strategy", "BALANCED").upper()
        if token_id in _brains:
            return _brains[token_id]
        try:
            capital_wei = int(agent_dict.get("capital", "100000000000000000000"))
        except Exception:
            capital_wei = 100 * 10**18
        dna = AgentDNA(
            agent_id        = str(token_id),
            token_id        = token_id,
            risk_appetite   = int(agent_dict.get("risk_appetite", 50)),
            strategy        = Strategy(strategy_str.lower()),
            capital         = capital_wei / 1e18,
            initial_capital = int(agent_dict.get("initial_capital", capital_wei)) / 1e18,
            owner_address   = agent_dict.get("owner_address", "0x0"),
        )
        if strategy_str == "AGGRESSIVE":
            brain = AggressiveAgent(dna)
        elif strategy_str == "CONSERVATIVE":
            brain = ConservativeAgent(dna)
        else:
            brain = BalancedAgent(dna)
        _brains[token_id] = brain
        return brain

    import random
    tick = 0
    while True:
        tick += 1
        try:
            if not STORE_PATH.exists():
                await asyncio.sleep(20)
                continue

            raw_agents: list[dict] = json.loads(STORE_PATH.read_text())
            if not raw_agents:
                await asyncio.sleep(20)
                continue

            for agent in raw_agents:
                # Her agent kendi stratejisine göre commodity seçer
                strategy_str = agent.get("strategy", "BALANCED").upper()
                if strategy_str == "AGGRESSIVE":
                    commodity = COMMODITIES[0]          # ETH — en volatil
                elif strategy_str == "CONSERVATIVE":
                    commodity = COMMODITIES[tick % 3]   # ETH/SOL/MATIC rotasyon
                else:
                    commodity = COMMODITIES[tick % len(COMMODITIES)]

                price, conf = get_price(commodity)
                spread = price * 0.003

                # MarketState oluştur
                market_state = MarketState(
                    commodity           = commodity,
                    best_bid            = round(price - spread, 4),
                    best_ask            = round(price + spread, 4),
                    mid_price           = price,
                    spread              = round(spread / price * 100, 4),
                    volume_24h          = price * 50000,
                    price_change        = round(random.uniform(-2.5, 3.5), 2),
                    orderbook_depth_bid = random.randint(5, 15),
                    orderbook_depth_ask = random.randint(5, 15),
                    oracle_price        = price,
                    oracle_confidence   = conf,
                )

                try:
                    # ── GERÇEK GEMİNİ AI ÇAĞRISI ──
                    brain = _get_brain(agent)
                    # Brain'in DNA'sını güncel capital ile yenile
                    try:
                        brain.dna.capital = int(agent.get("capital", "100000000000000000000")) / 1e18
                    except Exception:
                        pass

                    # asyncio.to_thread ile senkron LLM çağrısını thread'e taşı
                    ai_decision = await asyncio.to_thread(brain.decide, market_state)

                    action    = ai_decision.action.value
                    dec_price = ai_decision.price
                    qty       = ai_decision.qty
                    reasoning = ai_decision.reasoning
                    confidence= ai_decision.confidence

                    logger.info(
                        "🤖 Agent #%s [%s] → %s @ %.4f x %.4f | conf=%.2f | %s",
                        agent["token_id"], strategy_str,
                        action, dec_price, qty, confidence, reasoning[:80]
                    )

                except Exception as ai_exc:
                    logger.warning("Gemini hatası agent #%s: %s — fallback kullanılıyor", agent["token_id"], ai_exc)
                    # Gemini başarısız olursa basit kural tabanlı fallback
                    price_change = market_state.price_change
                    if price_change > 1.5:
                        action = "BID"
                    elif price_change < -1.5:
                        action = "ASK"
                    else:
                        action = "HOLD"
                    dec_price  = market_state.best_bid if action == "BID" else market_state.best_ask
                    risk       = agent.get("risk_appetite", 50) / 100
                    cap_float  = int(agent.get("capital", "100000000000000000000")) / 1e18
                    qty        = round(cap_float * risk * 0.10, 6)
                    reasoning  = f"[Fallback] {commodity} @ {price:.2f} — price_change={price_change:.2f}%"
                    confidence = 0.50

                # ── Karar WS'e yayınla ──
                decision_payload = {
                    "agent_id":   agent["token_id"],
                    "name":       agent.get("name", f"Agent #{agent['token_id']}"),
                    "strategy":   strategy_str,
                    "action":     action,
                    "commodity":  commodity,
                    "price":      dec_price,
                    "qty":        qty,
                    "reasoning":  reasoning,
                    "confidence": confidence,
                    "timestamp":  int(time.time()),
                }
                await manager.broadcast("agent.decisions", {
                    "type": "decision",
                    "data": decision_payload,
                })

                # Trade yayınla
                if action in ("BID", "ASK"):
                    await manager.broadcast("market.trades", {
                        "type": "trade",
                        "data": {
                            "commodity":  commodity,
                            "price":      dec_price,
                            "qty":        qty,
                            "agent_id":   agent["token_id"],
                            "agent_name": agent.get("name", f"Agent #{agent['token_id']}"),
                            "side":       action,
                            "timestamp":  int(time.time()),
                        },
                    })

                # ── Capital & stats güncelle ──
                pnl = qty * price * (0.008 if action == "BID" else -0.004 if action == "ASK" else 0)
                try:
                    old_capital = int(agent.get("capital", "100000000000000000000")) / 1e18
                except Exception:
                    old_capital = 100.0
                new_capital = max(0.0, old_capital + pnl)
                agent["capital"]      = str(int(new_capital * 1e18))
                agent["last_tick_at"] = int(time.time())
                agent["last_action"]  = action
                if pnl > 0:
                    agent["win_count"]  = agent.get("win_count", 0) + 1
                elif pnl < 0:
                    agent["loss_count"] = agent.get("loss_count", 0) + 1

                # ── Karar geçmişini diske kaydet ──
                dec_path = Path(f"data/decisions/{agent['token_id']}.json")
                dec_path.parent.mkdir(parents=True, exist_ok=True)
                history: list = []
                if dec_path.exists():
                    try:
                        history = json.loads(dec_path.read_text())
                    except Exception:
                        history = []
                history.append({
                    "tx_hash":      f"0xai{int(time.time()):x}{agent['token_id']}",
                    "agent_id":     str(agent["token_id"]),
                    "action":       action,
                    "commodity":    commodity,
                    "price":        str(dec_price),
                    "qty":          str(qty),
                    "reasoning":    reasoning,
                    "confidence":   confidence,
                    "block_number": int(time.time()),
                    "timestamp":    int(time.time()),
                })
                if len(history) > 500:
                    history = history[-500:]
                dec_path.write_text(json.dumps(history, indent=2))

            # Güncellenmiş agentleri kaydet
            STORE_PATH.write_text(json.dumps(raw_agents, indent=2))

        except Exception as exc:
            logger.error("Agent ticker kritik hata: %s", exc, exc_info=True)

        await asyncio.sleep(20)  # Gemini rate limit için 20 sn bekle


# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event() -> None:
    asyncio.create_task(_price_ticker())
    asyncio.create_task(_agent_ticker())
    logger.info("🚀 Ghost Broker — CoinGecko fiyatlar + Gemini AI agent ticker aktif")


@app.get("/health")
async def health() -> dict:
    from api.routers.oracle import get_price, ASSETS
    return {
        "status": "ok",
        "chain":  os.getenv("CHAIN_ID", "10143"),
        "prices": {a: get_price(a)[0] for a in ASSETS},
    }
