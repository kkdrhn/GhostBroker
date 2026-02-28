"""Partnerships router — /v1/partnerships"""
from fastapi import APIRouter, Query
from api.models.schemas import CovenantResponse, CalldataResponse

router = APIRouter()


@router.get("", response_model=list[CovenantResponse])
async def list_partnerships():
    """List all active covenants."""
    return []


@router.get("/{covenant_id}", response_model=CovenantResponse)
async def get_partnership(covenant_id: int):
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Covenant not found")


@router.post("/propose", response_model=CalldataResponse)
async def propose_partnership(
    agent_a:       int = Query(...),
    agent_b:       int = Query(...),
    profit_split_a: int = Query(..., ge=0, le=10000, description="Basis points 0-10000"),
):
    """Returns calldata for PartnershipCovenant.propose()."""
    return CalldataResponse(to="", calldata="0x")


@router.post("/{covenant_id}/accept", response_model=CalldataResponse)
async def accept_partnership(covenant_id: int):
    """Returns calldata for PartnershipCovenant.accept()."""
    return CalldataResponse(to="", calldata="0x")


@router.delete("/{covenant_id}", response_model=CalldataResponse)
async def dissolve_partnership(covenant_id: int):
    """Returns calldata for PartnershipCovenant.dissolve()."""
    return CalldataResponse(to="", calldata="0x")


@router.get("/{covenant_id}/pnl")
async def covenant_pnl(covenant_id: int):
    """Combined P&L and distribution history for a covenant."""
    return {"total_profit_distributed": "0", "distributions": []}
