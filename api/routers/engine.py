"""Engine router — /v1/engine"""
from fastapi import APIRouter, Query
from api.models.schemas import EngineStatusResponse, TradeResponse

router = APIRouter()


@router.get("/status", response_model=EngineStatusResponse)
async def engine_status():
    """Current block, last batch, queue depth, total trades."""
    # TODO: MatchEngine.getStats() + eth_blockNumber
    return EngineStatusResponse(
        current_block=0, last_batch_block=0,
        queue_depth=0, total_trades=0, total_volume="0"
    )


@router.get("/batch/{block_number}", response_model=list[TradeResponse])
async def batch_results(block_number: int):
    """All trades matched in a specific block."""
    return []


@router.get("/queue")
async def pending_queue():
    """Pending unmatched orders with TTL countdown."""
    return []


@router.get("/stats")
async def engine_stats():
    """Throughput: trades/block, avg settlement latency."""
    return {"trades_per_block": 0, "avg_latency_ms": 400, "block_time_ms": 400}
