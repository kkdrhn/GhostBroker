"""
Ghost Broker — Agent Runner
---------------------------
data/agents.json'daki tüm agentleri yükler ve orchestrator'ı başlatır.

Kullanım:
    python run_agents.py
    python run_agents.py --dry-run       # on-chain yazmadan sadece kararları logla
    python run_agents.py --tick 5        # 5 tick sonra dur (test modu)
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Proje kökünü PYTHONPATH'e ekle
sys.path.insert(0, str(Path(__file__).parent))

from agents.types import AgentDNA, Strategy, MarketState, ActionType
from agents.brain.aggressive_agent   import AggressiveAgent
from agents.brain.balanced_agent     import BalancedAgent
from agents.brain.conservative_agent import ConservativeAgent
from agents.market_feed import PriceFeed

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("run_agents")

AGENT_STORE = Path(os.getenv("AGENT_STORE_PATH", "data/agents.json"))
TICK_INTERVAL = float(os.getenv("TICK_INTERVAL_SECONDS", "0.8"))
COMMODITIES   = ["GHOST_ORE", "PHANTOM_GAS", "VOID_CHIP", "MON_USDC"]


# ── Helpers ────────────────────────────────────────────────────────────────────

def load_agents() -> list[AgentDNA]:
    """data/agents.json'daki tüm agentleri AgentDNA listesine dönüştür."""
    if not AGENT_STORE.exists():
        logger.warning("Agent store bulunamadı: %s", AGENT_STORE)
        return []

    raw: list[dict] = json.loads(AGENT_STORE.read_text())
    dnas: list[AgentDNA] = []

    for entry in raw:
        try:
            strategy_str = entry.get("strategy", "balanced").lower()
            strategy = Strategy(strategy_str)
        except ValueError:
            logger.warning("Bilinmeyen strateji '%s' — balanced kullanılıyor", entry.get("strategy"))
            strategy = Strategy.BALANCED

        dna = AgentDNA(
            agent_id        = str(entry.get("token_id", entry.get("id", "?"))),
            token_id        = int(entry.get("token_id", 0)),
            risk_appetite   = int(entry.get("risk_appetite", 50)),
            strategy        = strategy,
            capital         = float(entry.get("initial_capital", 100.0)),
            initial_capital = float(entry.get("initial_capital", 100.0)),
            owner_address   = entry.get("owner", "0x0000"),
        )
        dnas.append(dna)
        logger.info("  ✓ Agent #%s yüklendi: %s [%s] risk=%d",
                    dna.agent_id, entry.get("name", "?"), dna.strategy.value, dna.risk_appetite)

    return dnas


def make_brain(dna: AgentDNA):
    if dna.strategy == Strategy.AGGRESSIVE:
        return AggressiveAgent(dna)
    elif dna.strategy == Strategy.BALANCED:
        return BalancedAgent(dna)
    else:
        return ConservativeAgent(dna)


def pick_commodity(dna: AgentDNA, tick: int) -> str:
    if dna.strategy == Strategy.AGGRESSIVE:
        return COMMODITIES[0]               # en yüksek volatilite
    elif dna.strategy == Strategy.CONSERVATIVE:
        return COMMODITIES[tick % 3]        # sakin rotasyon
    else:
        return COMMODITIES[tick % len(COMMODITIES)]


async def build_market(feed: PriceFeed, commodity: str) -> MarketState:
    """Sentetik market state — gerçek feed desteklenmiyorsa fallback ile."""
    try:
        oracle_price, conf = await feed.fetch_oracle_price(commodity)
    except Exception:
        oracle_price, conf = 1.0, 0.8      # fallback

    spread_pct = 0.005
    return await feed.get_market_state(
        commodity    = commodity,
        best_bid     = oracle_price * (1 - spread_pct),
        best_ask     = oracle_price * (1 + spread_pct),
        volume_24h   = oracle_price * 10_000,
        price_change = 0.5,
        depth_bid    = 8,
        depth_ask    = 6,
    )


def save_decision(agent_id: str, decision) -> None:
    """Kararı data/decisions/{agent_id}.json dosyasına ekle."""
    path = Path("data/decisions") / f"{agent_id}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    history: list = []
    if path.exists():
        history = json.loads(path.read_text())
    history.append({
        "action":     decision.action.value,
        "commodity":  decision.commodity,
        "price":      decision.price,
        "qty":        decision.qty,
        "reasoning":  decision.reasoning,
        "confidence": decision.confidence,
    })
    path.write_text(json.dumps(history, indent=2))


# ── Main Loop ──────────────────────────────────────────────────────────────────

async def run(dry_run: bool = False, max_ticks: int = 0) -> None:
    dnas = load_agents()
    if not dnas:
        logger.error("Çalıştırılacak agent yok. Önce frontend'den agent yarat.")
        return

    brains = {dna.agent_id: make_brain(dna) for dna in dnas}
    feed   = PriceFeed()

    logger.info("🚀 Ghost Broker orchestrator başlıyor — %d agent, dry_run=%s", len(dnas), dry_run)

    tick = 0
    while True:
        tick += 1
        logger.info("═══ Tick #%d ═══════════════════════════════════════════", tick)

        for dna in dnas:
            commodity = pick_commodity(dna, tick)
            try:
                market   = await build_market(feed, commodity)
                decision = brains[dna.agent_id].decide(market)

                logger.info(
                    "  Agent #%s [%s] → %s @ %.4f x %.4f (conf=%.2f)",
                    dna.agent_id, dna.strategy.value,
                    decision.action.value, decision.price, decision.qty, decision.confidence,
                )
                logger.info("    Reasoning: %s", decision.reasoning[:120])

                if not dry_run:
                    save_decision(dna.agent_id, decision)

            except Exception as exc:
                logger.error("  Agent #%s hata: %s", dna.agent_id, exc)

        if max_ticks and tick >= max_ticks:
            logger.info("✅ %d tick tamamlandı, çıkılıyor.", max_ticks)
            break

        await asyncio.sleep(TICK_INTERVAL)


# ── CLI Entry Point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ghost Broker Agent Runner")
    parser.add_argument("--dry-run", action="store_true",
                        help="On-chain yazmadan sadece kararları logla")
    parser.add_argument("--tick", type=int, default=0, metavar="N",
                        help="N tick sonra dur (0 = sonsuz döngü)")
    args = parser.parse_args()

    asyncio.run(run(dry_run=args.dry_run, max_ticks=args.tick))
