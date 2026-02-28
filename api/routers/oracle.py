"""Oracle router — /v1/oracle
Gerçek fiyatlar: CoinGecko API'den ETH, SOL, MATIC, BNB çeker.
Fallback: son bilinen fiyat kullanılır.
Background task her 30 saniyede günceller.
"""
from __future__ import annotations

import time
import asyncio
import logging
import aiohttp

from fastapi import APIRouter, Query
from api.models.schemas import OracleFeedResponse, AgentDecisionResponse

router = APIRouter()
logger = logging.getLogger(__name__)

# Gerçek kripto varlıkları
ASSETS = ["ETH", "SOL", "MATIC", "BNB", "MON"]

# CoinGecko ID eşlemesi
COINGECKO_IDS = {
    "ETH":   "ethereum",
    "SOL":   "solana",
    "MATIC": "matic-network",
    "BNB":   "binancecoin",
    "MON":   "monad", # Placeholder/Mock
}

# Varsayılan başlangıç fiyatları (CoinGecko erişilemezse)
_prices: dict[str, float] = {
    "ETH":   3200.0,
    "SOL":   140.0,
    "MATIC": 0.55,
    "BNB":   580.0,
    "MON":   2.50,
}
_updated_at: dict[str, int] = {k: int(time.time()) for k in ASSETS}
_last_fetch: float = 0.0


async def fetch_coingecko_prices() -> None:
    """CoinGecko'dan gerçek USD fiyatlarını çek."""
    global _last_fetch
    ids = ",".join(COINGECKO_IDS.values())
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    now = int(time.time())
                    for asset, cg_id in COINGECKO_IDS.items():
                        if cg_id in data and "usd" in data[cg_id]:
                            _prices[asset] = float(data[cg_id]["usd"])
                            _updated_at[asset] = now
                    _last_fetch = time.time()
                    logger.info("CoinGecko fiyatlar güncellendi: %s", {k: _prices[k] for k in ASSETS})
    except Exception as exc:
        logger.warning("CoinGecko fetch hatası: %s — önceki fiyat kullanılıyor", exc)


def tick_prices() -> None:
    """Senkron çağrı için wrapper (background loop'ta kullanılır)."""
    pass  # Artık async fetch_coingecko_prices kullanıyoruz


def get_price(asset: str) -> tuple[float, float]:
    return _prices.get(asset, 0.0), 0.95


@router.get("/feeds", response_model=list[OracleFeedResponse])
async def list_feeds():
    """Tüm aktif kripto fiyatlarını döndür (USD cinsinden)."""
    return [
        OracleFeedResponse(
            asset=a,
            commodity=a,
            price=_prices.get(a, 0.0),
            confidence=0.95,
            updated_at=_updated_at.get(a, 0),
        )
        for a in ASSETS
    ]


@router.get("/feeds/{asset}", response_model=OracleFeedResponse)
async def get_feed(asset: str):
    """Tek bir asset için son fiyat."""
    return OracleFeedResponse(
        asset=asset.upper(),
        commodity=asset.upper(),
        price=_prices.get(asset.upper(), 0.0),
        confidence=0.95,
        updated_at=_updated_at.get(asset.upper(), int(time.time())),
    )


@router.get("/decisions", response_model=list[AgentDecisionResponse])
async def all_decisions(limit: int = Query(50, le=200)):
    return []


@router.get("/decisions/{agent_id}", response_model=list[AgentDecisionResponse])
async def agent_decisions_oracle(agent_id: str, limit: int = Query(20, le=100)):
    return []


@router.post("/trigger/{agent_id}")
async def trigger_agent_tick(agent_id: str):
    return {"status": "triggered", "agent_id": agent_id}


@router.get("/decisions", response_model=list[AgentDecisionResponse])
async def all_decisions(limit: int = Query(50, le=200)):
    """Last N on-chain agent decisions from all agents."""
    return []


@router.get("/decisions/{agent_id}", response_model=list[AgentDecisionResponse])
async def agent_decisions_oracle(agent_id: str, limit: int = Query(20, le=100)):
    """Decisions for one specific agent."""
    return []


@router.post("/trigger/{agent_id}")
async def trigger_agent_tick(agent_id: str):
    """Manually trigger an agent brain tick (dev/demo use only)."""
    # TODO: signal orchestrator to run the agent immediately
    return {"status": "triggered", "agent_id": agent_id}
