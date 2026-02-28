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
COMMODITIES = ["ETH", "SOL", "MATIC", "BNB", "MON"]

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
    import random
    from api.routers.oracle import get_price
    from agents.types import AgentDNA, MarketState, Strategy
    from agents.brain.aggressive_agent   import AggressiveAgent
    from agents.brain.balanced_agent     import BalancedAgent
    from agents.brain.conservative_agent import ConservativeAgent

    await asyncio.sleep(5)  # backend tam açılsın

    tick = 0
    while True:
        tick += 1
        try:
            if not STORE_PATH.exists():
                await asyncio.sleep(20)
                continue

            raw_agents: list[dict] = json.loads(STORE_PATH.read_text())
            if not raw_agents:
                logger.info("⏳ Henüz kayıtlı agent yok, bekleniyor...")
                await asyncio.sleep(20)
                continue

            logger.info("━━━ Tick #%d — %d agent işleniyor ━━━", tick, len(raw_agents))

            for agent in raw_agents:
                token_id     = agent["token_id"]
                strategy_str = agent.get("strategy", "BALANCED").upper()
                name         = agent.get("name", f"Agent #{token_id}")
                risk         = int(agent.get("risk_appetite", 50))

                # Güncel capital hesapla
                try:
                    capital_wei     = int(agent.get("capital", "1000000000000000000"))
                    capital_usd     = capital_wei / 1e18
                    init_capital    = int(agent.get("initial_capital", capital_wei)) / 1e18
                except Exception:
                    capital_usd  = 1.0
                    init_capital = 1.0

                # Her tick'te strateji + risk'e göre commodity seç
                if strategy_str == "AGGRESSIVE":
                    commodity = COMMODITIES[4]               # MON — Monad
                elif strategy_str == "CONSERVATIVE":
                    commodity = COMMODITIES[tick % 3]        # ETH/SOL/MATIC rotasyon
                else:
                    commodity = COMMODITIES[tick % len(COMMODITIES)]

                price, conf = get_price(commodity)
                spread_abs  = price * 0.003
                price_change = round(random.uniform(-3.5, 4.0), 2)

                market_state = MarketState(
                    commodity           = commodity,
                    best_bid            = round(price - spread_abs, 4),
                    best_ask            = round(price + spread_abs, 4),
                    mid_price           = price,
                    spread              = round(spread_abs / price * 100, 4),
                    volume_24h          = price * 50000,
                    price_change        = price_change,
                    orderbook_depth_bid = random.randint(5, 20),
                    orderbook_depth_ask = random.randint(5, 20),
                    oracle_price        = price,
                    oracle_confidence   = conf,
                )

                # Her tick'te güncel DNA ile brain oluştur (cache yok — her zaman taze)
                dna = AgentDNA(
                    agent_id        = str(token_id),
                    token_id        = token_id,
                    risk_appetite   = risk,
                    strategy        = Strategy(strategy_str.lower()),
                    capital         = capital_usd,
                    initial_capital = init_capital,
                    owner_address   = agent.get("owner_address", "0x0"),
                    name            = name,
                )
                if strategy_str == "AGGRESSIVE":
                    brain = AggressiveAgent(dna)
                elif strategy_str == "CONSERVATIVE":
                    brain = ConservativeAgent(dna)
                else:
                    brain = BalancedAgent(dna)

                logger.info(
                    "🔍 [%s | #%d] %s | kapital=%.2f USD | risk=%d/100 | commodity=%s @ %.4f | Δ=%.2f%%",
                    strategy_str, token_id, name, capital_usd, risk, commodity, price, price_change
                )

                try:
                    # ── GERÇEK GEMİNİ AI ÇAĞRISI ──
                    ai_decision = await asyncio.to_thread(brain.decide, market_state)

                    action     = ai_decision.action.value
                    dec_price  = ai_decision.price
                    qty        = ai_decision.qty
                    reasoning  = ai_decision.reasoning
                    confidence = ai_decision.confidence

                    logger.info(
                        "🤖 [%s | #%d] %s → %s @ %.4f x %.6f | conf=%.2f\n    💬 %s",
                        strategy_str, token_id, name,
                        action, dec_price, qty, confidence, reasoning
                    )

                except Exception as ai_exc:
                    logger.warning(
                        "⚠️  Gemini hatası [#%d %s]: %s — kural tabanlı fallback",
                        token_id, name, ai_exc
                    )
                    # Gemini başarısız olursa kural tabanlı fallback
                    if market_state.price_change > 1.5:
                        action = "BID"
                    elif market_state.price_change < -1.5:
                        action = "ASK"
                    else:
                        action = "HOLD"
                    dec_price  = market_state.best_bid if action == "BID" else market_state.best_ask
                    qty        = round(capital_usd * (risk / 100) * 0.10, 6)
                    reasoning  = f"[Fallback] {commodity} @ {price:.4f} — Δ={market_state.price_change:.2f}%"
                    confidence = 0.50

                # ── Karar WS'e yayınla ──
                decision_payload = {
                    "agent_id":   token_id,
                    "name":       name,
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
                            "agent_id":   token_id,
                            "agent_name": name,
                            "side":       action,
                            "timestamp":  int(time.time()),
                        },
                    })

                # ── Capital & stats güncelle ──
                pnl = qty * price * (0.008 if action == "BID" else -0.004 if action == "ASK" else 0)
                new_capital = max(0.0, capital_usd + pnl)
                agent["capital"]           = str(int(new_capital * 1e18))
                agent["last_tick_at"]      = int(time.time())
                agent["last_action"]       = action
                agent["preferred_commodity"] = commodity
                if pnl > 0:
                    agent["win_count"]  = agent.get("win_count", 0) + 1
                elif pnl < 0:
                    agent["loss_count"] = agent.get("loss_count", 0) + 1

                # ── Karar geçmişini diske kaydet ──
                dec_entry = {
                    "tx_hash":      f"0xai{int(time.time()):x}{token_id}",
                    "agent_id":     str(token_id),
                    "agent_name":   name,
                    "strategy":     strategy_str,
                    "action":       action,
                    "commodity":    commodity,
                    "price":        str(dec_price),
                    "qty":          str(qty),
                    "reasoning":    reasoning,
                    "confidence":   confidence,
                    "block_number": int(time.time()),
                    "timestamp":    int(time.time()),
                }

                # Agent'a özel decisions dosyası
                dec_path = Path(f"data/decisions/{token_id}.json")
                dec_path.parent.mkdir(parents=True, exist_ok=True)
                history: list = []
                if dec_path.exists():
                    try:
                        history = json.loads(dec_path.read_text())
                    except Exception:
                        history = []
                history.append(dec_entry)
                if len(history) > 1000:
                    history = history[-1000:]
                dec_path.write_text(json.dumps(history, indent=2))

                # Global decisions log (tüm agentlar)
                global_dec_path = Path("data/decisions_all.json")
                global_dec: list = []
                if global_dec_path.exists():
                    try:
                        global_dec = json.loads(global_dec_path.read_text())
                    except Exception:
                        global_dec = []
                global_dec.append(dec_entry)
                if len(global_dec) > 2000:
                    global_dec = global_dec[-2000:]
                global_dec_path.write_text(json.dumps(global_dec, indent=2))

                # Global trades log
                if action in ("BID", "ASK"):
                    trade_entry = {
                        "commodity":  commodity,
                        "price":      str(dec_price),
                        "qty":        str(qty),
                        "agent_id":   str(token_id),
                        "agent_name": name,
                        "strategy":   strategy_str,
                        "side":       action,
                        "timestamp":  int(time.time()),
                    }
                    trades_path = Path("data/trades.json")
                    trades_log: list = []
                    if trades_path.exists():
                        try:
                            trades_log = json.loads(trades_path.read_text())
                        except Exception:
                            trades_log = []
                    trades_log.append(trade_entry)
                    if len(trades_log) > 2000:
                        trades_log = trades_log[-2000:]
                    trades_path.write_text(json.dumps(trades_log, indent=2))

            # Güncellenmiş agentleri kaydet
            STORE_PATH.write_text(json.dumps(raw_agents, indent=2))

        except Exception as exc:
            logger.error("🔴 Agent ticker kritik hata: %s", exc, exc_info=True)

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
