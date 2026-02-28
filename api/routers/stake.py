"""Stake router — /v1/stake"""
from fastapi import APIRouter, Query
from api.models.schemas import VaultResponse, StakerPositionResponse, CalldataResponse

router = APIRouter()


@router.get("/vaults", response_model=list[VaultResponse])
async def list_vaults():
    """All staking vaults with TVL and APY multiplier per agent."""
    return []


@router.get("/{agent_id}", response_model=dict)
async def get_stake_by_agent(agent_id: int):
    """Stake info for an agent — returns empty stub so frontend doesn't 404."""
    return {"agent_id": agent_id, "total_staked": "0", "share_price": "1", "apy": 0.0}


@router.get("/vaults/{agent_id}", response_model=VaultResponse)
async def get_vault(agent_id: int):
    """Vault details: TVL, share price, APY multiplier."""
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Vault not found")


@router.post("/deposit", response_model=CalldataResponse)
async def deposit(agent_id: int = Query(...), amount: str = Query(...)):
    """Returns calldata for StakeVault.deposit(agentId, amount)."""
    return CalldataResponse(to="", calldata="0x")


@router.post("/withdraw", response_model=CalldataResponse)
async def withdraw(agent_id: int = Query(...), shares: str = Query(...)):
    """Returns calldata for StakeVault.withdraw(agentId, shares)."""
    return CalldataResponse(to="", calldata="0x")


@router.get("/positions/{address}", response_model=list[StakerPositionResponse])
async def staker_positions(address: str):
    """All staking positions for a wallet."""
    return []


@router.get("/rewards/{address}")
async def staker_rewards(address: str):
    """Claimable + claimed rewards by address."""
    return {"claimable": "0", "claimed": "0"}


@router.post("/claim", response_model=CalldataResponse)
async def claim_rewards(agent_id: int = Query(...)):
    """Returns calldata for StakeVault.claimRewards(agentId)."""
    return CalldataResponse(to="", calldata="0x")
