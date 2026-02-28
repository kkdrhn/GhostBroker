"""
Ghost Broker — Conservative Agent Brain
Spread-capture, low-drawdown market-maker strategy.
Uses LangChain + Google Gemini.
"""
from __future__ import annotations

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from agents.types import AgentDNA, MarketState, AgentDecision, ActionType


class LLMDecision(BaseModel):
    action:     str   = Field(description="One of BID, ASK, HOLD, PARTNER")
    price:      float = Field(description="Limit price in GHOST per unit")
    qty:        float = Field(description="Quantity in commodity units")
    reasoning:  str   = Field(description="2-3 sentence rationale")
    confidence: float = Field(description="Confidence 0.0-1.0", ge=0.0, le=1.0)


SYSTEM_PROMPT = """
You are a CONSERVATIVE autonomous trading agent in the Ghost Broker marketplace.
Your mandate: post tight limit orders both sides of the book, capture the spread, never hold large directional positions.
Risk appetite: {risk_appetite}/100 (very low). Capital preservation is priority #1.

Current capital: {capital} GHOST  |  Initial capital: {initial_capital} GHOST
Commodity: {commodity}
Market: bid={best_bid} ask={best_ask} mid={mid_price} spread={spread}
Oracle price: {oracle_price} (confidence: {oracle_confidence})
24h volume: {volume_24h}  |  Price change: {price_change}%
Order-book depth: bids={depth_bid} asks={depth_ask}

Rules:
- Post BID 0.5% below oracle when spread > 0.5% (market-make the bid)
- Post ASK 0.5% above oracle when spread > 0.5% (market-make the ask)
- If price_change > 3% in either direction: HOLD (volatility too high)
- HOLD if spread < 0.2% (not enough margin)
- PARTNER with another conservative to increase capital pool and improve fill probability
- Size positions at 3-8% of capital; max drawdown target 5%

{format_instructions}
"""


class ConservativeAgent:
    def __init__(self, dna: AgentDNA):
        self.dna = dna
        self._llm = ChatGoogleGenerativeAI(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            temperature=0.2,
            google_api_key=os.getenv("GEMINI_API_KEY"),
        )
        self._parser = PydanticOutputParser(pydantic_object=LLMDecision)
        self._prompt = ChatPromptTemplate.from_messages([("system", SYSTEM_PROMPT)])

    def decide(self, market: MarketState) -> AgentDecision:
        chain = self._prompt | self._llm | self._parser
        result: LLMDecision = chain.invoke({
            "risk_appetite":     self.dna.risk_appetite,
            "capital":           self.dna.capital,
            "initial_capital":   self.dna.initial_capital,
            "commodity":         market.commodity,
            "best_bid":          market.best_bid,
            "best_ask":          market.best_ask,
            "mid_price":         market.mid_price,
            "spread":            market.spread,
            "oracle_price":      market.oracle_price,
            "oracle_confidence": market.oracle_confidence,
            "volume_24h":        market.volume_24h,
            "price_change":      market.price_change,
            "depth_bid":         market.orderbook_depth_bid,
            "depth_ask":         market.orderbook_depth_ask,
            "format_instructions": self._parser.get_format_instructions(),
        })

        return AgentDecision(
            agent_id   = self.dna.agent_id,
            action     = ActionType(result.action),
            commodity  = market.commodity,
            price      = result.price,
            qty        = result.qty,
            reasoning  = result.reasoning,
            confidence = result.confidence,
        )
