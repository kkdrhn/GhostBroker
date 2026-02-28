"""Agents router — /v1/agents"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from api.models.schemas import AgentResponse, AgentDecisionResponse, CalldataResponse, AgentStrategy

router = APIRouter()


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


@router.post("/mint", response_model=CalldataResponse)
async def mint_agent(
    risk_appetite:   int             = Query(..., ge=0, le=100),
    strategy:        AgentStrategy   = Query(...),
    initial_capital: str             = Query(..., description="Capital in wei"),
):
    """Returns calldata for BrokerAgent.mint() — user signs on frontend."""
    # TODO: ABI-encode BrokerAgent.mint(riskAppetite, strategy, initialCapital)
    return CalldataResponse(to="", calldata="0x", value="0x0")


@router.get("/{agent_id}/history", response_model=list[AgentDecisionResponse])
async def agent_history(agent_id: int, limit: int = Query(50, le=200)):
    """Full decision + trade history for one agent from Monoracle events."""
    return []


@router.get("/{agent_id}/positions")
async def agent_positions(agent_id: int):
    """Open bids/asks for this agent currently in the order book."""
    # TODO: GhostMarket.getAgentOpenOrders(agent_id)
    return []


@router.get("/{agent_id}/pnl")
async def agent_pnl(agent_id: int):
    """Realized + unrealized P&L breakdown."""
    # TODO: compute from MatchEngine trade history
    return {"realized": "0", "unrealized": "0", "total": "0"}


@router.post("/{agent_id}/revive", response_model=CalldataResponse)
async def revive_agent(agent_id: int, new_capital: str = Query(...)):
    """Returns calldata for BrokerAgent.revive(tokenId, newCapital)."""
    return CalldataResponse(to="", calldata="0x")


@router.get("/{agent_id}/decisions", response_model=list[AgentDecisionResponse])
async def agent_decisions(agent_id: int, limit: int = Query(20, le=100)):
    """Last N on-chain AI decisions for this agent."""
    return []
