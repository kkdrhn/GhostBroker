"""Pydantic response models for all API endpoints."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Shared ─────────────────────────────────────────────────────────────────────
class ErrorResponse(BaseModel):
    code:    str
    message: str
    details: dict = Field(default_factory=dict)


# ── Agent ──────────────────────────────────────────────────────────────────────
class AgentState(str, Enum):
    ACTIVE   = "ACTIVE"
    ELITE    = "ELITE"
    BANKRUPT = "BANKRUPT"
    REVIVED  = "REVIVED"


class AgentStrategy(str, Enum):
    AGGRESSIVE   = "AGGRESSIVE"
    BALANCED     = "BALANCED"
    CONSERVATIVE = "CONSERVATIVE"


class AgentResponse(BaseModel):
    token_id:           int
    owner_address:      str
    name:               Optional[str] = None
    risk_appetite:      int
    strategy:           AgentStrategy
    initial_capital:    str   # wei string
    capital:            str   # wei string
    state:              AgentState
    win_count:          int
    loss_count:         int
    created_at:         int
    last_tick_at:       int
    score:              Optional[int] = None
    reputation_score:   Optional[int] = None
    last_action:        Optional[str] = None
    preferred_commodity: Optional[str] = None


class AgentDecisionResponse(BaseModel):
    tx_hash:   str
    agent_id:  str
    action:    str
    commodity: str
    price:     str
    qty:       str
    reasoning: str
    confidence: float
    block_number: int
    timestamp:   int


# ── Market ──────────────────────────────────────────────────────────────────────
class OrderSide(str, Enum):
    BID = "BID"
    ASK = "ASK"


class OrderStatus(str, Enum):
    OPEN      = "OPEN"
    MATCHED   = "MATCHED"
    EXPIRED   = "EXPIRED"
    CANCELLED = "CANCELLED"


class OrderResponse(BaseModel):
    order_id:      str
    agent_id:      int
    agent_owner:   str
    commodity:     str
    side:          OrderSide
    price:         str
    qty:           str
    filled_qty:    str
    status:        OrderStatus
    ttl_blocks:    int
    created_block: int
    created_at:    int


class TradeResponse(BaseModel):
    bid_order_id:   str
    ask_order_id:   str
    agent_bid:      int
    agent_ask:      int
    commodity:      str
    matched_qty:    str
    matched_price:  str
    fee_burned:     str
    block_number:   int
    timestamp:      int


class CandleResponse(BaseModel):
    time:   int
    open:   float
    high:   float
    low:    float
    close:  float
    volume: float


class SpreadResponse(BaseModel):
    commodity: str
    best_bid:  str
    best_ask:  str
    mid_price: float
    spread_pct: float


# ── Engine ─────────────────────────────────────────────────────────────────────
class EngineStatusResponse(BaseModel):
    current_block:      int
    last_batch_block:   int
    queue_depth:        int
    total_trades:       int
    total_volume:       str  # wei


# ── Staking ────────────────────────────────────────────────────────────────────
class VaultResponse(BaseModel):
    agent_id:         int
    total_shares:     str
    total_deposited:  str
    total_rewards:    str
    apy_multiplier:   int   # 100–300 (1x–3x)


class StakerPositionResponse(BaseModel):
    agent_id:        int
    shares:          str
    pending_rewards: str


# ── Reputation ─────────────────────────────────────────────────────────────────
class ReputationResponse(BaseModel):
    agent_id:      int
    total_trades:  int
    wins:          int
    losses:        int
    win_rate:      float   # 0-100%
    profit_factor: float
    max_drawdown:  str
    score:         int     # 0-10000
    apy_multiplier: int


class LeaderboardEntry(BaseModel):
    rank:     int
    agent_id: int
    score:    int
    state:    AgentState
    capital:  str


# ── Partnership ────────────────────────────────────────────────────────────────
class CovenantStatus(str, Enum):
    PROPOSED  = "PROPOSED"
    ACTIVE    = "ACTIVE"
    DISSOLVED = "DISSOLVED"


class CovenantResponse(BaseModel):
    covenant_id:              int
    agent_a:                  int
    agent_b:                  int
    capital_a:                str
    capital_b:                str
    profit_split_a:           int   # basis points
    profit_split_b:           int
    status:                   CovenantStatus
    proposed_at:              int
    activated_at:             int
    dissolved_at:             int
    total_profit_distributed: str


# ── Token ──────────────────────────────────────────────────────────────────────
class TokenStatsResponse(BaseModel):
    total_supply:      str
    circulating_supply: str
    total_burned:      str
    burn_rate_24h:     str


class BurnEventResponse(BaseModel):
    tx_hash:     str
    burner:      str
    amount:      str
    total_burned: str
    block_number: int
    timestamp:   int


# ── Oracle ─────────────────────────────────────────────────────────────────────
class OracleFeedResponse(BaseModel):
    asset:      str
    commodity:  str = ""   # frontend CommodityTicker için alias
    price:      float
    confidence: float
    updated_at: int


# ── Calldata Wrappers ──────────────────────────────────────────────────────────
class CalldataResponse(BaseModel):
    to:       str
    calldata: str
    value:    str = "0x0"
