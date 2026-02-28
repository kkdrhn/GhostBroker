"""Token router — /v1/token"""
from fastapi import APIRouter, Query
from api.models.schemas import TokenStatsResponse, BurnEventResponse

router = APIRouter()


@router.get("/stats", response_model=TokenStatsResponse)
async def token_stats():
    """Total supply, circulating supply, total burned, burn rate."""
    return TokenStatsResponse(
        total_supply="1000000000000000000000000000",
        circulating_supply="0",
        total_burned="0",
        burn_rate_24h="0",
    )


@router.get("/burns", response_model=list[BurnEventResponse])
async def burn_events(limit: int = Query(50, le=200)):
    """Recent GHOST burn events."""
    return []


@router.get("/balance/{address}")
async def token_balance(address: str):
    """GHOST token balance of a wallet."""
    return {"address": address, "balance": "0"}
