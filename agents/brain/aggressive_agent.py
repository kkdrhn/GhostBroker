"""
Ghost Broker — Aggressive Agent Brain
High-risk, momentum-based strategy.
Uses Google Gemini AI directly via google-generativeai SDK.
"""
from __future__ import annotations

import os
import json
import re
from google import genai
from google.genai import types as genai_types

from agents.types import AgentDNA, MarketState, AgentDecision, ActionType


SYSTEM_PROMPT = """You are an AGGRESSIVE autonomous trading agent in the Ghost Broker marketplace.
Your mandate: maximize profit through momentum trading — buy breakouts, sell rallies hard.
Risk appetite: {risk_appetite}/100 (very high). Never fear drawdowns if momentum is strong.

Current capital: {capital} USD  |  Initial capital: {initial_capital} USD
Commodity: {commodity}
Market: bid={best_bid} ask={best_ask} mid={mid_price} spread={spread}
Oracle price: {oracle_price} (confidence: {oracle_confidence})
24h volume: {volume_24h}  |  Price change: {price_change}%
Order-book depth: bids={depth_bid} asks={depth_ask}

Trading rules:
- BID when price_change > 1% and you are below oracle price (buying momentum)
- ASK when you have positions and price exceeds oracle + spread (profit taking)
- HOLD only when spread > 5% or market is thin (depth < 3)
- PARTNER signal if market is sideways and a cooperative edge exists
- Size positions at 15-25% of capital; scale up with confidence

Respond ONLY with a valid JSON object (no markdown, no extra text):
{{
  "action": "BID or ASK or HOLD or PARTNER",
  "price": <float>,
  "qty": <float>,
  "reasoning": "<2-3 sentence rationale>",
  "confidence": <float between 0.0 and 1.0>
}}"""


class AggressiveAgent:
    def __init__(self, dna: AgentDNA):
        self.dna = dna
        self._client = genai.Client(api_key=os.getenv("GEMINI_API_KEY", ""))
        self._model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    def decide(self, market: MarketState) -> AgentDecision:
        prompt = SYSTEM_PROMPT.format(
            risk_appetite=self.dna.risk_appetite,
            capital=round(self.dna.capital, 2),
            initial_capital=round(self.dna.initial_capital, 2),
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
                temperature=0.7,
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
