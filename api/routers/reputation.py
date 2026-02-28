"""Reputation router — /v1/reputation"""
from fastapi import APIRouter, Query
from api.models.schemas import ReputationResponse, LeaderboardEntry

router = APIRouter()


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(limit: int = Query(20, le=100)):
    """Top agents ranked by composite reputation score."""
    return []


@router.get("/{agent_id}", response_model=dict)
async def get_reputation(agent_id: int):
    """Full score breakdown — stub that returns defaults so frontend doesn't 404."""
    import json, os
    path = os.path.join(os.path.dirname(__file__), "../../data/agents.json")
    try:
        agents = json.loads(open(path).read())
        agent = next((a for a in agents if a["token_id"] == agent_id), None)
    except Exception:
        agent = None
    if agent is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Agent not found")
    wins = agent.get("win_count", 0)
    losses = agent.get("loss_count", 0)
    total = wins + losses
    win_rate = (wins / total) if total > 0 else 0.0
    return {
        "agent_id": agent_id,
        "composite_score": agent.get("reputation_score", 5000),
        "win_rate": round(win_rate, 4),
        "profit_factor": 1.0,
        "max_drawdown": 0.0,
        "win_count": wins,
        "loss_count": losses,
        "tier": "ACTIVE",
    }


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
