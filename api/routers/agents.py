"""Agents router — /v1/agents"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from api.models.schemas import AgentResponse, AgentDecisionResponse, CalldataResponse, AgentStrategy

router = APIRouter()


# ── Request body for mint calldata ────────────────────────────────────────────
class MintCalldataRequest(BaseModel):
    owner:           str
    risk_appetite:   int
    strategy:        int   # 0=CONSERVATIVE 1=BALANCED 2=AGGRESSIVE
    initial_capital: str   # wei string


@router.get("", response_model=list[AgentResponse])
async def list_agents(
    state:    str | None = Query(None, description="Filter: ACTIVE|ELITE|BANKRUPT|REVIVED"),
    strategy: str | None = Query(None),
    limit:    int        = Query(20, le=100),
    offset:   int        = Query(0),
):
    """List all BrokerAgent NFTs, optionally filtered by state/strategy."""
    # TODO: read from BrokerAgent.totalSupply() + getDNA() via RPC
    return []


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int):
    """Get a single agent's full DNA, capital and state."""
    # TODO: BrokerAgent.getDNA(agent_id) via RPC
    raise HTTPException(status_code=404, detail="Agent not found")


@router.post("/mint/calldata", response_model=CalldataResponse)
async def mint_agent_calldata(body: MintCalldataRequest):
    """
    Returns ABI-encoded calldata for BrokerAgent.mint().
    Frontend sends this via wagmi sendTransaction — user signs, gas paid in MON.
    """
    # TODO: ABI-encode BrokerAgent.mint(owner, riskAppetite, strategy, initialCapital)
    # import api.services.chain as chain
    # calldata = chain.encode_mint(body.owner, body.risk_appetite, body.strategy, body.initial_capital)
    import os
    contract = os.getenv("BROKER_AGENT_ADDRESS", "0x0000000000000000000000000000000000000001")
    return CalldataResponse(
        to=contract,
        calldata="0x",   # TODO: real ABI encoding
        value="0x0",
    )


@router.get("/{agent_id}/history", response_model=list[AgentDecisionResponse])
async def agent_history(agent_id: int, limit: int = Query(50, le=200)):
    """Full decision + trade history for one agent from Monoracle events."""
    return []


@router.get("/{agent_id}/orders")
async def agent_orders(agent_id: int, status: str | None = Query(None)):
    """Open bids/asks for this agent currently in the order book."""
    # TODO: GhostMarket.getAgentOpenOrders(agent_id)
    return []


@router.get("/{agent_id}/positions")
async def agent_positions(agent_id: int):
    """Open positions alias (backward compat)."""
    return []


@router.get("/{agent_id}/lifecycle")
async def agent_lifecycle(agent_id: int):
    """BrokerAgent lifecycle events: CREATED, ELITE_PROMOTION, BANKRUPTCY, REVIVAL."""
    # TODO: filter Transfer + custom events for agent_id
    return {"events": []}


@router.get("/{agent_id}/pnl")
async def agent_pnl(agent_id: int):
    """Realized + unrealized P&L breakdown."""
    return {"realized": "0", "unrealized": "0", "total": "0"}


@router.post("/{agent_id}/revive", response_model=CalldataResponse)
async def revive_agent(agent_id: int, new_capital: str = Query(...)):
    """Returns calldata for BrokerAgent.revive(tokenId, newCapital)."""
    return CalldataResponse(to="", calldata="0x")


@router.get("/{agent_id}/decisions", response_model=list[AgentDecisionResponse])
async def agent_decisions(agent_id: int, limit: int = Query(20, le=100)):
    """Last N on-chain AI decisions for this agent."""
    return []
