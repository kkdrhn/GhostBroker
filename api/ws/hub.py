"""
WebSocket Hub — manages subscriptions and broadcast for all real-time channels.
"""
from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

websocket_router = APIRouter()

# Channel → set of connected WebSockets
_subscribers: dict[str, set[WebSocket]] = defaultdict(set)
_lock = asyncio.Lock()


class ConnectionManager:
    async def connect(self, ws: WebSocket, channel: str) -> None:
        await ws.accept()
        async with _lock:
            _subscribers[channel].add(ws)
        logger.info("WS connected: channel=%s total=%d", channel, len(_subscribers[channel]))

    async def disconnect(self, ws: WebSocket, channel: str) -> None:
        async with _lock:
            _subscribers[channel].discard(ws)

    async def broadcast(self, channel: str, data: Any) -> None:
        payload = json.dumps(data)
        dead: list[WebSocket] = []
        for ws in list(_subscribers.get(channel, [])):
            try:
                await ws.send_text(payload)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws, channel)


manager = ConnectionManager()


# ── WebSocket Endpoint ─────────────────────────────────────────────────────────
@websocket_router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, channels: str = "") -> None:
    """
    Multiplex WebSocket.
    ?channels=channel1,channel2 ile otomatik subscribe olur.
    Client ayrıca { "subscribe": "channel_name" } gönderebilir.
    """
    await ws.accept()
    active_channels: set[str] = set()

    # Query parametresi ile gelen kanalları otomatik subscribe et
    if channels:
        for ch in channels.split(","):
            ch = ch.strip()
            if ch:
                async with _lock:
                    _subscribers[ch].add(ws)
                active_channels.add(ch)
                logger.info("Auto-subscribed: channel=%s", ch)

    try:
        while True:
            try:
                raw = await asyncio.wait_for(ws.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Heartbeat ping
                await ws.send_text(json.dumps({"type": "ping"}))
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"error": "Invalid JSON"}))
                continue

            channel = _resolve_channel(msg)

            if not channel:
                await ws.send_text(json.dumps({"error": "Unknown channel"}))
                continue

            if "subscribe" in msg:
                async with _lock:
                    _subscribers[channel].add(ws)
                active_channels.add(channel)
                await ws.send_text(json.dumps({"subscribed": channel}))

            elif "unsubscribe" in msg:
                async with _lock:
                    _subscribers[channel].discard(ws)
                active_channels.discard(channel)
                await ws.send_text(json.dumps({"unsubscribed": channel}))

    except WebSocketDisconnect:
        for ch in active_channels:
            async with _lock:
                _subscribers[ch].discard(ws)
        logger.info("WS disconnected, cleaned %d channels", len(active_channels))


def _resolve_channel(msg: dict) -> str | None:
    ch = msg.get("subscribe") or msg.get("unsubscribe") or ""
    params = msg.get("params", {})

    # Allow dynamic commodity channels: market.orderbook.GHOST_ORE
    if ch.startswith("market.orderbook."):
        return ch
    if ch.startswith("market.price."):
        return ch

    VALID = {
        "market.trades", "agent.lifecycle", "agent.decisions",
        "engine.batch", "token.burns", "stake.rewards", "partnerships",
        "oracle.prices", "chain.block",
    }
    return ch if ch in VALID else None


# ── Broadcast helpers used by background tasks ─────────────────────────────────
async def broadcast_trade(trade: dict) -> None:
    await manager.broadcast("market.trades", {"type": "trade", "data": trade})


async def broadcast_orderbook(commodity: str, diff: dict) -> None:
    await manager.broadcast(f"market.orderbook.{commodity}", {"type": "diff", "data": diff})


async def broadcast_price(commodity: str, price: float, confidence: float) -> None:
    await manager.broadcast(f"market.price.{commodity}", {
        "type": "price", "commodity": commodity,
        "price": price, "confidence": confidence,
    })


async def broadcast_lifecycle(agent_id: int, old_state: str, new_state: str) -> None:
    await manager.broadcast("agent.lifecycle", {
        "type": "lifecycle", "agentId": agent_id,
        "from": old_state, "to": new_state,
    })


async def broadcast_decision(decision: dict) -> None:
    await manager.broadcast("agent.decisions", {"type": "decision", "data": decision})


async def broadcast_burn(amount: str, total: str) -> None:
    await manager.broadcast("token.burns", {"type": "burn", "amount": amount, "totalBurned": total})
