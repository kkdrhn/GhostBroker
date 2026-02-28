"""
Ghost Broker — Market Feed
Reads live prices from Monoracle + memecoin WebSocket feeds.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import AsyncGenerator, Callable

import aiohttp
import websockets

from agents.types import MarketState

logger = logging.getLogger(__name__)

MONORACLE_RPC    = os.getenv("MONAD_RPC_URL", "https://testnet-rpc.monad.xyz")
MONORACLE_WS     = os.getenv("MONAD_WS_URL",  "wss://testnet-rpc.monad.xyz")
MEMECOIN_WS_URL  = os.getenv("MEMECOIN_WS_URL", "wss://stream.binance.com:9443/ws")

COMMODITIES = ["GHOST_ORE", "PHANTOM_GAS", "VOID_CHIP"]
SYMBOLS_MAP = {
    "MON_USDC": "monadusdt",  # example mapping to Binance stream
}

# ── Simulated seed prices for fictional commodities ────────────────────────────
BASE_PRICES: dict[str, float] = {
    "GHOST_ORE":   1.00,
    "PHANTOM_GAS": 2.50,
    "VOID_CHIP":   5.00,
}


class PriceFeed:
    """Aggregates Monoracle on-chain prices + off-chain memecoin ticks."""

    def __init__(self) -> None:
        self._prices: dict[str, float] = dict(BASE_PRICES)
        self._confidence: dict[str, float] = {k: 0.95 for k in BASE_PRICES}
        self._callbacks: list[Callable[[str, float], None]] = []

    def on_price_update(self, cb: Callable[[str, float], None]) -> None:
        self._callbacks.append(cb)

    def _notify(self, commodity: str, price: float) -> None:
        for cb in self._callbacks:
            try:
                cb(commodity, price)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Price callback error: %s", exc)

    # ── Monoracle Pull ──────────────────────────────────────────────────────────
    async def fetch_oracle_price(self, commodity: str) -> tuple[float, float]:
        """
        Calls Monoracle smart contract via eth_call to get (price, confidence).
        Falls back to simulated price if oracle is unavailable.
        """
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "jsonrpc": "2.0",
                    "method":  "eth_call",
                    "params": [
                        {
                            "to":   os.getenv("MONORACLE_CONTRACT", "0x0000000000000000000000000000000000000001"),
                            "data": f"0x{_encode_get_price(commodity)}",
                        },
                        "latest",
                    ],
                    "id": 1,
                }
                async with session.post(MONORACLE_RPC, json=payload, timeout=aiohttp.ClientTimeout(total=3)) as resp:
                    data = await resp.json()
                    result = data.get("result", "0x")
                    price = _decode_price(result)
                    return price, 0.98
        except Exception as exc:  # noqa: BLE001
            logger.debug("Oracle fetch failed for %s: %s — using simulated price", commodity, exc)
            return self._prices.get(commodity, 1.0), 0.70

    # ── Memecoin WebSocket ──────────────────────────────────────────────────────
    async def stream_memecoin_prices(self) -> None:
        """Subscribe to Binance-style WebSocket for MON/USDC price."""
        symbol = SYMBOLS_MAP.get("MON_USDC", "btcusdt")
        uri    = f"{MEMECOIN_WS_URL}/{symbol}@ticker"
        while True:
            try:
                async with websockets.connect(uri) as ws:
                    logger.info("Connected to memecoin stream: %s", uri)
                    async for raw in ws:
                        msg = json.loads(raw)
                        price = float(msg.get("c", 0))  # last price
                        if price > 0:
                            self._prices["MON_USDC"] = price
                            self._notify("MON_USDC", price)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Memecoin stream disconnected: %s — reconnecting in 2s", exc)
                await asyncio.sleep(2)

    # ── Monad Log Subscription (monadLogs) ─────────────────────────────────────
    async def subscribe_monad_logs(
        self, contract_address: str
    ) -> AsyncGenerator[dict, None]:
        """Subscribe to Monad WebSocket eth_subscribe logs for a given contract."""
        sub_id = None
        while True:
            try:
                async with websockets.connect(MONORACLE_WS) as ws:
                    sub_req = json.dumps({
                        "jsonrpc": "2.0",
                        "method":  "eth_subscribe",
                        "params":  ["logs", {"address": contract_address}],
                        "id":      1,
                    })
                    await ws.send(sub_req)
                    resp = json.loads(await ws.recv())
                    sub_id = resp.get("result")
                    logger.info("Subscribed to Monad logs, sub_id=%s", sub_id)
                    async for raw in ws:
                        msg = json.loads(raw)
                        if msg.get("params", {}).get("subscription") == sub_id:
                            yield msg["params"]["result"]
            except Exception as exc:  # noqa: BLE001
                logger.warning("Monad log stream error: %s — reconnecting in 1s", exc)
                await asyncio.sleep(1)

    # ── Market State Builder ────────────────────────────────────────────────────
    async def get_market_state(
        self,
        commodity: str,
        best_bid: float,
        best_ask: float,
        volume_24h: float = 0.0,
        price_change: float = 0.0,
        depth_bid: int = 0,
        depth_ask: int = 0,
    ) -> MarketState:
        oracle_price, oracle_conf = await self.fetch_oracle_price(commodity)
        mid = (best_bid + best_ask) / 2 if best_bid and best_ask else oracle_price
        spread = ((best_ask - best_bid) / mid * 100) if mid > 0 else 0.0

        return MarketState(
            commodity          = commodity,
            best_bid           = best_bid,
            best_ask           = best_ask,
            mid_price          = mid,
            spread             = spread,
            volume_24h         = volume_24h,
            price_change       = price_change,
            orderbook_depth_bid = depth_bid,
            orderbook_depth_ask = depth_ask,
            oracle_price       = oracle_price,
            oracle_confidence  = oracle_conf,
        )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _encode_get_price(commodity: str) -> str:
    """Encode a minimal getPrice(bytes32) call ABI."""
    # Function selector: keccak256("getPrice(bytes32)")[:4]
    selector = "a4b5d9e2"  # placeholder — replace with actual selector from ABI
    padded   = commodity.encode().hex().ljust(64, "0")[:64]
    return selector + padded


def _decode_price(hex_result: str) -> float:
    """Decode a uint256 result from eth_call into a float price (18-decimal)."""
    try:
        raw = int(hex_result, 16)
        return raw / 1e18
    except Exception:  # noqa: BLE001
        return 1.0
