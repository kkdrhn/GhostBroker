"""
Ghost Broker — Conservative Agent Brain
Spread-capture, low-drawdown market-maker strategy.
Uses Google Gemini AI directly via google-generativeai SDK.
"""
from __future__ import annotations

import os
import json
import re
from google import genai
from google.genai import types as genai_types

from agents.types import AgentDNA, MarketState, AgentDecision, ActionType


SYSTEM_PROMPT = """You are "{agent_name}", a CONSERVATIVE autonomous trading agent in the Ghost Broker marketplace.
Personality: Cautious market-maker — post tight limit orders both sides, capture spread, never hold large directional positions.

=== YOUR IDENTITY ===
Name:             {agent_name}
Strategy:         CONSERVATIVE
Risk Appetite:    {risk_appetite}/100 (very low)
Current Capital:  {capital} USD
Initial Capital:  {initial_capital} USD
P&L:              {pnl_pct:+.2f}%

=== LIVE MARKET ===
Commodity:    {commodity}
Bid / Ask:    {best_bid} / {best_ask}
Mid Price:    {mid_price}
Spread:       {spread}%
Oracle Price: {oracle_price}  (confidence: {oracle_confidence})
24h Volume:   {volume_24h}
Price Change: {price_change}%
Book Depth:   bids={depth_bid}  asks={depth_ask}

=== YOUR TRADING RULES ===
- Post BID 0.5% below oracle when spread > 0.5% (market-make the bid)
- Post ASK 0.5% above oracle when spread > 0.5% (market-make the ask)
- HOLD if price_change > 3% in either direction (volatility too high)
- HOLD if spread < 0.2% (margin too thin)
- PARTNER with another conservative agent to increase capital pool
- Size: 3-8% of your current capital ({size_min:.2f}–{size_max:.2f} USD); max drawdown target 5%

Respond ONLY with a valid JSON object (no markdown, no extra text):
{{
  "action": "BID or ASK or HOLD or PARTNER",
  "price": <float>,
  "qty": <float>,
  "reasoning": "<2-3 sentence rationale mentioning your name and current capital>",
  "confidence": <float between 0.0 and 1.0>
}}"""


class ConservativeAgent:
    def __init__(self, dna: AgentDNA):
        self.dna = dna
        self._client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
        self._model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    def decide(self, market: MarketState) -> AgentDecision:
        pnl_pct = ((self.dna.capital - self.dna.initial_capital) / max(self.dna.initial_capital, 0.001)) * 100
        size_min = self.dna.capital * 0.03
        size_max = self.dna.capital * 0.08

        prompt = SYSTEM_PROMPT.format(
            agent_name=self.dna.name or f"Agent #{self.dna.token_id}",
            risk_appetite=self.dna.risk_appetite,
            capital=round(self.dna.capital, 4),
            initial_capital=round(self.dna.initial_capital, 4),
            pnl_pct=pnl_pct,
            size_min=size_min,
            size_max=size_max,
            commodity=market.commodity,
            best_bid=round(market.best_bid, 4),
            best_ask=round(market.best_ask, 4),
            mid_price=round(market.mid_price, 4),
            spread=round(market.spread, 4),
            oracle_price=round(market.oracle_price, 4),
            oracle_confidence=round(market.oracle_confidence, 3),
            volume_24h=market.volume_24h,
            price_change=round(market.price_change, 2),
            depth_bid=market.orderbook_depth_bid,
            depth_ask=market.orderbook_depth_ask,
        )

        response = self._client.models.generate_content(
            model=self._model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )

        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)

        return AgentDecision(
            agent_id=self.dna.agent_id,
            action=ActionType(data["action"]),
            commodity=market.commodity,
            price=float(data["price"]),
            qty=float(data["qty"]),
            reasoning=str(data["reasoning"]),
            confidence=float(data["confidence"]),
        )
