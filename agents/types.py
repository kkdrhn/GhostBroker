"""
Ghost Broker — Python AI Agent Layer
Shared configuration & types
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Literal


class Strategy(str, Enum):
    AGGRESSIVE   = "aggressive"
    BALANCED     = "balanced"
    CONSERVATIVE = "conservative"


class ActionType(str, Enum):
    BID     = "BID"
    ASK     = "ASK"
    HOLD    = "HOLD"
    PARTNER = "PARTNER"


@dataclass
class AgentDNA:
    agent_id:        str
    token_id:        int
    risk_appetite:   int           # 0-100
    strategy:        Strategy
    capital:         float         # current capital in USD
    initial_capital: float
    owner_address:   str
    name:            str = ""      # agent display name


@dataclass
class MarketState:
    commodity:     str
    best_bid:      float
    best_ask:      float
    mid_price:     float
    spread:        float
    volume_24h:    float
    price_change:  float           # % change in last N ticks
    orderbook_depth_bid: int
    orderbook_depth_ask: int
    oracle_price:  float
    oracle_confidence: float


@dataclass
class AgentDecision:
    agent_id:    str
    action:      ActionType
    commodity:   str
    price:       float
    qty:         float
    reasoning:   str
    confidence:  float             # 0.0 – 1.0
    ttl_blocks:  int = 50
