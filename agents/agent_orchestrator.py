"""
Ghost Broker — Agent Orchestrator
CrewAI multi-agent coordinator — runs all agents every 2 blocks.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from crewai import Agent, Crew, Task

from agents.types import AgentDNA, MarketState, Strategy
from agents.brain.aggressive_agent   import AggressiveAgent
from agents.brain.balanced_agent     import BalancedAgent
from agents.brain.conservative_agent import ConservativeAgent
from agents.market_feed   import PriceFeed
from agents.monoracle_writer import MonoracleWriter

logger = logging.getLogger(__name__)

TICK_INTERVAL_BLOCKS = 2   # Run agent brains every 2 Monad blocks (~800ms)
BLOCK_TIME_SECONDS   = 0.4 # Monad target block time


class AgentOrchestrator:
    """
    Coordinates all deployed BrokerAgent NFTs:
    1. Reads on-chain agent DNA
    2. Fetches market state per commodity
    3. Routes each agent to its brain (aggressive/balanced/conservative)
    4. Writes each decision on-chain via MonoracleWriter
    """

    def __init__(
        self,
        agent_configs: list[dict[str, Any]],  # list of {token_id, dna, private_key, contracts}
        rpc_url: str | None = None,
    ) -> None:
        self._feed    = PriceFeed()
        self._configs = agent_configs
        self._writer  = MonoracleWriter(
            private_key           = os.getenv("KEEPER_PRIVATE_KEY", ""),
            ghost_market_address  = os.getenv("GHOST_MARKET_ADDRESS", ""),
            broker_agent_address  = os.getenv("BROKER_AGENT_ADDRESS", ""),
        )
        self._brains: dict[str, AggressiveAgent | BalancedAgent | ConservativeAgent] = {}
        self._init_brains()

    def _init_brains(self) -> None:
        for cfg in self._configs:
            dna: AgentDNA = cfg["dna"]
            if dna.strategy == Strategy.AGGRESSIVE:
                self._brains[dna.agent_id] = AggressiveAgent(dna)
            elif dna.strategy == Strategy.BALANCED:
                self._brains[dna.agent_id] = BalancedAgent(dna)
            else:
                self._brains[dna.agent_id] = ConservativeAgent(dna)

    # ── Main Loop ──────────────────────────────────────────────────────────────

    async def run(self) -> None:
        """Main orchestration loop — ticks every 2 blocks."""
        await self._writer.connect()
        logger.info("Orchestrator started — %d agents", len(self._configs))

        # Start memecoin feed in background
        asyncio.create_task(self._feed.stream_memecoin_prices())

        commodities = ["GHOST_ORE", "PHANTOM_GAS", "VOID_CHIP", "MON_USDC"]
        tick = 0

        while True:
            tick += 1
            logger.info("─── Tick #%d ───────────────────────────────────────", tick)

            for cfg in self._configs:
                dna: AgentDNA = cfg["dna"]
                token_id: int = cfg["token_id"]

                if dna.strategy == Strategy.CONSERVATIVE:
                    commodity = commodities[tick % 3]  # conservative rotates calmly
                elif dna.strategy == Strategy.AGGRESSIVE:
                    commodity = commodities[0]          # aggressive targets highest-vol
                else:
                    commodity = commodities[tick % len(commodities)]

                try:
                    market = await self._build_market_state(commodity)
                    brain  = self._brains[dna.agent_id]
                    decision = brain.decide(market)

                    logger.info(
                        "Agent %s [%s] → %s @ %.4f x %.4f (conf=%.2f) | %s",
                        dna.agent_id, dna.strategy.value,
                        decision.action.value, decision.price, decision.qty,
                        decision.confidence, decision.reasoning[:60],
                    )

                    tx = await self._writer.write_decision(decision, token_id)
                    logger.info("Written on-chain: tx=%s", tx)

                except Exception as exc:  # noqa: BLE001
                    logger.error("Agent %s tick failed: %s", dna.agent_id, exc)

            # Wait for 2 Monad blocks
            await asyncio.sleep(TICK_INTERVAL_BLOCKS * BLOCK_TIME_SECONDS)

    async def _build_market_state(self, commodity: str) -> MarketState:
        """
        In production: read GhostMarket order book via RPC for real bid/ask.
        For demo: use oracle price ±0.5% as synthetic spread.
        """
        oracle_price, _ = await self._feed.fetch_oracle_price(commodity)
        spread_pct = 0.005
        best_bid = oracle_price * (1 - spread_pct)
        best_ask = oracle_price * (1 + spread_pct)

        return await self._feed.get_market_state(
            commodity    = commodity,
            best_bid     = best_bid,
            best_ask     = best_ask,
            volume_24h   = oracle_price * 10_000,
            price_change = 0.5,
            depth_bid    = 8,
            depth_ask    = 6,
        )

    # ── CrewAI Multi-Agent Task (used for complex partnership decisions) ────────

    def create_partnership_crew(
        self, dna_a: AgentDNA, dna_b: AgentDNA, market: MarketState
    ) -> Crew:
        """
        Deploys a CrewAI crew where agentA proposes, agentB evaluates a partnership.
        """
        proposer = Agent(
            role="Partnership Proposer",
            goal=(
                f"Propose a profitable partnership with another agent. "
                f"Your strategy: {dna_a.strategy.value}. Capital: {dna_a.capital} GHOST."
            ),
            backstory="You are a Ghost Broker trading agent specialising in alliances.",
            verbose=True,
        )
        evaluator = Agent(
            role="Partnership Evaluator",
            goal=(
                f"Evaluate whether to accept a partnership. "
                f"Your strategy: {dna_b.strategy.value}. Capital: {dna_b.capital} GHOST."
            ),
            backstory="You scrutinise partnership proposals for mutual benefit.",
            verbose=True,
        )

        propose_task = Task(
            description=(
                f"Propose a capital split and profit split to form a covenant. "
                f"Market commodity: {market.commodity}, mid-price: {market.mid_price}. "
                f"Suggest a profit split (A%, B%) and explain the rationale."
            ),
            agent=proposer,
            expected_output="A proposed profit split and justification.",
        )
        evaluate_task = Task(
            description=(
                "Review the proposal. Accept if expected combined edge > 15%. "
                "Reject if the proposer's risk profile endangers your capital."
            ),
            agent=evaluator,
            expected_output="ACCEPT or REJECT with reasoning.",
        )

        return Crew(
            agents=[proposer, evaluator],
            tasks=[propose_task, evaluate_task],
            verbose=True,
        )
