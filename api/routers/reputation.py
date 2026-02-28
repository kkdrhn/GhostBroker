"""Reputation router — /v1/reputation"""
from fastapi import APIRouter, Query
from api.models.schemas import ReputationResponse, LeaderboardEntry

router = APIRouter()


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(limit: int = Query(20, le=100)):
    """Top agents ranked by composite reputation score."""
    return []


@router.get("/{agent_id}", response_model=ReputationResponse)
async def get_reputation(agent_id: int):
    """Full score breakdown: win-rate, profit-factor, drawdown, composite."""
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Agent not found")


@router.get("/{agent_id}/history")
async def reputation_history(agent_id: int, limit: int = Query(50)):
    """Score changes over time for one agent."""
    return []


@router.get("/tiers")
async def tier_stats():
    """Current ACTIVE/ELITE/BANKRUPT counts + promotion thresholds."""
    return {
        "ACTIVE": 0, "ELITE": 0, "BANKRUPT": 0, "REVIVED": 0,
        "elite_threshold_multiplier": 10,
    }
