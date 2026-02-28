"""Agents router — /v1/agents
Ajanlar blockchain NFT olarak değil, backend'de JSON store'da tutulur.
Her ajan: token_id (otomatik artan), DNA (risk_appetite, strategy, capital),
owner_address, name, state.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from api.models.schemas import (
    AgentResponse, AgentDecisionResponse, AgentStrategy, AgentState
)

router = APIRouter()

# ── Basit JSON veri deposu ────────────────────────────────────────────────────
_STORE_PATH = Path(os.getenv("AGENT_STORE_PATH", "data/agents.json"))


def _load() -> list[dict]:
    if not _STORE_PATH.exists():
        _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        _STORE_PATH.write_text("[]")
    return json.loads(_STORE_PATH.read_text())


def _save(agents: list[dict]) -> None:
    _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _STORE_PATH.write_text(json.dumps(agents, indent=2))


# ── Request modelleri ─────────────────────────────────────────────────────────
class CreateAgentRequest(BaseModel):
    owner:           str   = Field(..., description="Cüzdan adresi")
    name:            str   = Field("", max_length=32, description="Ajan adı (opsiyonel)")
    risk_appetite:   int   = Field(..., ge=0, le=100)
    strategy:        str   = Field(..., description="AGGRESSIVE | BALANCED | CONSERVATIVE")
    initial_capital: float = Field(..., gt=0, description="Başlangıç sermayesi (MON)")


STRATEGY_MAP = {
    "aggressive": AgentStrategy.AGGRESSIVE,
    "balanced":   AgentStrategy.BALANCED,
    "conservative": AgentStrategy.CONSERVATIVE,
    "AGGRESSIVE": AgentStrategy.AGGRESSIVE,
    "BALANCED":   AgentStrategy.BALANCED,
    "CONSERVATIVE": AgentStrategy.CONSERVATIVE,
    "0": AgentStrategy.CONSERVATIVE,
    "1": AgentStrategy.BALANCED,
    "2": AgentStrategy.AGGRESSIVE,
}


# ── Endpoint'ler ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[AgentResponse])
async def list_agents(
    state:    Optional[str] = Query(None),
    strategy: Optional[str] = Query(None),
    owner:    Optional[str] = Query(None),
    limit:    int           = Query(20, le=100),
    offset:   int           = Query(0),
):
    """Kayıtlı tüm ajanları listele."""
    agents = _load()
    if state:
        agents = [a for a in agents if a["state"].upper() == state.upper()]
    if strategy:
        agents = [a for a in agents if a["strategy"].upper() == strategy.upper()]
    if owner:
        agents = [a for a in agents if a["owner_address"].lower() == owner.lower()]
    agents = agents[offset: offset + limit]
    return [AgentResponse(**a) for a in agents]


@router.post("", response_model=AgentResponse, status_code=201)
async def create_agent(body: CreateAgentRequest):
    """
    Yeni ajan oluştur ve backend'e kaydet.
    Her ajan benzersiz risk DNA'sına, stratejisine ve sermayesine sahiptir.
    """
    agents = _load()

    # Otomatik artan token_id
    next_id = max((a["token_id"] for a in agents), default=0) + 1

    strategy_enum = STRATEGY_MAP.get(str(body.strategy))
    if not strategy_enum:
        raise HTTPException(400, f"Geçersiz strateji: {body.strategy}")

    # Sermayeyi wei string'e çevir
    capital_wei = str(int(body.initial_capital * 1e18))

    # Ajan ismi: verilmemişse otomatik üret
    agent_name = body.name.strip() or f"Agent #{next_id}"

    new_agent = {
        "token_id":        next_id,
        "owner_address":   body.owner,
        "name":            agent_name,
        "risk_appetite":   body.risk_appetite,
        "strategy":        strategy_enum.value,
        "initial_capital": capital_wei,
        "capital":         capital_wei,
        "state":           AgentState.ACTIVE.value,
        "win_count":       0,
        "loss_count":      0,
        "created_at":      int(time.time()),
        "last_tick_at":    int(time.time()),
        "score":           5000,
        "reputation_score": 5000,
        "last_action":     "CREATED",
        "preferred_commodity": "GHOST_ORE",
    }

    agents.append(new_agent)
    _save(agents)

    return AgentResponse(**new_agent)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int):
    """Tek bir ajanın detaylarını getir."""
    agents = _load()
    for a in agents:
        if a["token_id"] == agent_id:
            return AgentResponse(**a)
    raise HTTPException(status_code=404, detail=f"Ajan bulunamadı: {agent_id}")


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: int):
    """Ajanı sil."""
    agents = _load()
    new_agents = [a for a in agents if a["token_id"] != agent_id]
    if len(new_agents) == len(agents):
        raise HTTPException(404, "Ajan bulunamadı")
    _save(new_agents)


@router.get("/{agent_id}/decisions", response_model=list[AgentDecisionResponse])
async def agent_decisions(agent_id: int, limit: int = Query(20, le=100)):
    """Bu ajanın son AI kararlarını getir."""
    decision_file = Path(f"data/decisions/{agent_id}.json")
    if not decision_file.exists():
        return []
    decisions = json.loads(decision_file.read_text())
    return decisions[-limit:]


@router.get("/{agent_id}/lifecycle")
async def agent_lifecycle(agent_id: int):
    """Ajan yaşam döngüsü olayları."""
    lifecycle_file = Path(f"data/lifecycle/{agent_id}.json")
    if not lifecycle_file.exists():
        return {"events": []}
    return {"events": json.loads(lifecycle_file.read_text())}


@router.get("/{agent_id}/orders")
async def agent_orders(agent_id: int, status: Optional[str] = Query(None)):
    """Ajanın açık emirleri."""
    return []


@router.get("/{agent_id}/history", response_model=list[AgentDecisionResponse])
async def agent_history(agent_id: int, limit: int = Query(50, le=200)):
    """Karar geçmişi (decisions ile aynı)."""
    return await agent_decisions(agent_id, limit)

@router.get("/{agent_id}/orders")
async def agent_orders(agent_id: int, status: str | None = Query(None)):
    """Open bids/asks for this agent currently in the order book."""
    # TODO: GhostMarket.getAgentOpenOrders(agent_id)
    return []


@router.get("/{agent_id}/positions")
async def agent_positions(agent_id: int):
    """Open positions alias (backward compat)."""
    return []


@router.get("/{agent_id}/lifecycle")
async def agent_lifecycle(agent_id: int):
    """BrokerAgent lifecycle events: CREATED, ELITE_PROMOTION, BANKRUPTCY, REVIVAL."""
@router.get("/{agent_id}/pnl")
async def agent_pnl(agent_id: int):
    """P&L özeti."""
    return {"realized": "0", "unrealized": "0", "total": "0"}
