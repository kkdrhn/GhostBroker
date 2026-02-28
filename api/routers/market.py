"""Market router — /v1/market"""
from __future__ import annotations

import json
from pathlib import Path
from fastapi import APIRouter, Query
from api.models.schemas import (
    OrderResponse, TradeResponse, CandleResponse,
    SpreadResponse, CalldataResponse, OrderSide,
)

router = APIRouter()

COMMODITIES = ["ETH", "SOL", "MATIC", "BNB", "MON"]

_TRADES_PATH   = Path("data/trades.json")
_DEC_ALL_PATH  = Path("data/decisions_all.json")


def _load_json(p: Path) -> list:
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text())
    except Exception:
        return []


@router.get("/commodities")
async def list_commodities():
    return [{"name": c, "bytes32": _commodity_keccak(c)} for c in COMMODITIES]


@router.get("/orderbook/{commodity}")
async def get_orderbook(commodity: str, depth: int = Query(20, le=100)):
    """Full L2 order book snapshot for a commodity."""
    # TODO: GhostMarket.getBidOrderIds + getAskOrderIds then batch getDNA
    return {"bids": [], "asks": [], "commodity": commodity}


@router.get("/orderbook/{commodity}/spread", response_model=SpreadResponse)
async def get_spread(commodity: str):
    """Best bid, best ask, mid-price, spread for a commodity."""
    return SpreadResponse(
        commodity=commodity, best_bid="0", best_ask="0", mid_price=0.0, spread_pct=0.0
    )


@router.post("/orders", response_model=CalldataResponse)
async def post_order(
    agent_id:  int       = Query(...),
    commodity: str       = Query(...),
    side:      OrderSide = Query(...),
    price:     str       = Query(..., description="Price in wei"),
    qty:       str       = Query(..., description="Quantity in wei"),
    ttl:       int       = Query(50),
):
    """Returns calldata for GhostMarket.postOrder()."""
    return CalldataResponse(to="", calldata="0x")


@router.delete("/orders/{order_id}", response_model=CalldataResponse)
async def cancel_order(order_id: str):
    """Returns calldata for GhostMarket.cancelOrder()."""
    return CalldataResponse(to="", calldata="0x")


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str):
    """Get a single order by ID."""
    # TODO: GhostMarket.getOrder(orderId)
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Order not found")


@router.get("/trades")
async def global_trades(
    limit:     int = Query(50, ge=1, le=200),
    page:      int = Query(1, ge=1),
    commodity: str = Query(None),
    agent_id:  str = Query(None),
):
    """Global AI trade feed — sayfalama: page + limit. Filtre: commodity, agent_id."""
    all_trades = list(reversed(_load_json(_TRADES_PATH)))
    if commodity:
        all_trades = [t for t in all_trades if t.get("commodity") == commodity]
    if agent_id:
        all_trades = [t for t in all_trades if str(t.get("agent_id")) == agent_id]
    total = len(all_trades)
    start = (page - 1) * limit
    items = all_trades[start : start + limit]
    return {
        "total":      total,
        "page":       page,
        "page_size":  limit,
        "total_pages": max(1, (total + limit - 1) // limit),
        "items":      items,
    }


@router.get("/decisions")
async def global_decisions(
    limit:     int = Query(50, ge=1, le=200),
    page:      int = Query(1, ge=1),
    commodity: str = Query(None),
    agent_id:  str = Query(None),
    action:    str = Query(None),
):
    """Global AI decision log — sayfalama: page + limit. Filtre: commodity, agent_id, action."""
    all_dec = list(reversed(_load_json(_DEC_ALL_PATH)))
    if commodity:
        all_dec = [d for d in all_dec if d.get("commodity") == commodity]
    if agent_id:
        all_dec = [d for d in all_dec if str(d.get("agent_id")) == agent_id]
    if action:
        all_dec = [d for d in all_dec if d.get("action") == action.upper()]
    total = len(all_dec)
    start = (page - 1) * limit
    items = all_dec[start : start + limit]
    return {
        "total":       total,
        "page":        page,
        "page_size":   limit,
        "total_pages": max(1, (total + limit - 1) // limit),
        "items":       items,
    }


@router.get("/trades/{commodity}")
async def commodity_trades(
    commodity: str,
    limit:     int = Query(50, ge=1, le=200),
    page:      int = Query(1, ge=1),
):
    """Belirli bir commodity için trade geçmişi — sayfalama destekli."""
    all_trades = list(reversed(_load_json(_TRADES_PATH)))
    filtered   = [t for t in all_trades if t.get("commodity") == commodity]
    total      = len(filtered)
    start      = (page - 1) * limit
    return {
        "total":       total,
        "page":        page,
        "page_size":   limit,
        "total_pages": max(1, (total + limit - 1) // limit),
        "items":       filtered[start : start + limit],
    }


@router.get("/candles/{commodity}", response_model=list[CandleResponse])
async def candles(commodity: str, interval: str = Query("1m")):
    """OHLCV candle data built from MatchEngine trade history."""
    return []


@router.get("/price/{commodity}")
async def commodity_price(commodity: str):
    """Latest index price from Monoracle."""
    return {"commodity": commodity, "price": "0", "confidence": 0.0, "updated_at": 0}


# ── Helpers ────────────────────────────────────────────────────────────────────
def _commodity_keccak(name: str) -> str:
    from web3 import Web3
    return Web3.keccak(text=name).hex()
