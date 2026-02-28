"""Market router — /v1/market"""
from __future__ import annotations

from fastapi import APIRouter, Query
from api.models.schemas import (
    OrderResponse, TradeResponse, CandleResponse,
    SpreadResponse, CalldataResponse, OrderSide,
)

router = APIRouter()

COMMODITIES = ["GHOST_ORE", "PHANTOM_GAS", "VOID_CHIP", "MON_USDC"]


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


@router.get("/trades", response_model=list[TradeResponse])
async def global_trades(limit: int = Query(50, le=200), offset: int = Query(0)):
    """Global trade feed from MatchEngine history."""
    return []


@router.get("/trades/{commodity}", response_model=list[TradeResponse])
async def commodity_trades(commodity: str, limit: int = Query(50, le=200)):
    return []


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
