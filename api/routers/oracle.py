"""Oracle router — /v1/oracle"""
from fastapi import APIRouter, Query
from api.models.schemas import OracleFeedResponse, AgentDecisionResponse

router = APIRouter()

ASSETS = ["GHOST_ORE", "PHANTOM_GAS", "VOID_CHIP", "MON_USDC"]


@router.get("/feeds", response_model=list[OracleFeedResponse])
async def list_feeds():
    """All active Monoracle price feeds."""
    return [OracleFeedResponse(asset=a, price=0.0, confidence=0.0, updated_at=0) for a in ASSETS]


@router.get("/feeds/{asset}", response_model=OracleFeedResponse)
async def get_feed(asset: str):
    """Latest price + confidence for a specific asset."""
    return OracleFeedResponse(asset=asset, price=0.0, confidence=0.0, updated_at=0)


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
