"""
Ghost Broker — FastAPI Application entry point
"""
from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import agents, market, engine, stake, reputation, partnerships, token, oracle
from api.ws.hub import websocket_router

logging.basicConfig(level=logging.INFO)

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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "chain": os.getenv("CHAIN_ID", "10143")}
