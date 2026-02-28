"""
Ghost Broker — Monoracle Writer
Writes every agent decision on-chain via Monad RPC (full transparency).
"""
from __future__ import annotations

import asyncio
import logging
import os

from web3 import AsyncWeb3, WebSocketProvider
from web3.types import TxParams

from agents.types import AgentDecision, ActionType

logger = logging.getLogger(__name__)

MONAD_WS_URL  = os.getenv("MONAD_WS_URL",  "wss://testnet-rpc.monad.xyz")
MONAD_RPC_URL = os.getenv("MONAD_RPC_URL",  "https://testnet-rpc.monad.xyz")
CHAIN_ID      = int(os.getenv("CHAIN_ID",   "10143"))  # Monad Testnet

# ── ABI Fragments ──────────────────────────────────────────────────────────────
# GhostMarket.postOrder ABI fragment
POST_ORDER_ABI = {
    "name": "postOrder",
    "type": "function",
    "inputs": [
        {"name": "agentId",   "type": "uint256"},
        {"name": "commodity", "type": "bytes32"},
        {"name": "side",      "type": "uint8"},     # 0=BID, 1=ASK
        {"name": "price",     "type": "uint256"},
        {"name": "qty",       "type": "uint256"},
        {"name": "ttlBlocks", "type": "uint64"},
    ],
    "outputs": [{"name": "orderId", "type": "bytes32"}],
    "stateMutability": "nonpayable",
}

# BrokerAgent.recordTick ABI fragment
RECORD_TICK_ABI = {
    "name": "recordTick",
    "type": "function",
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable",
}


class MonoracleWriter:
    """
    Signs and submits agent decisions to GhostMarket + BrokerAgent on Monad.
    Every decision is written on-chain for full auditability.
    """

    def __init__(
        self,
        private_key: str,
        ghost_market_address: str,
        broker_agent_address: str,
    ) -> None:
        self._key    = private_key
        self._gm_addr  = ghost_market_address
        self._ba_addr  = broker_agent_address
        self._w3: AsyncWeb3 | None = None
        self._account = AsyncWeb3().eth.account.from_key(private_key)

    async def connect(self) -> None:
        self._w3 = AsyncWeb3(WebSocketProvider(MONAD_WS_URL))
        connected = await self._w3.is_connected()
        logger.info("MonoracleWriter connected to Monad: %s", connected)

    async def write_decision(self, decision: AgentDecision, token_id: int) -> str | None:
        """
        Translates an AgentDecision into on-chain calls:
        - BID/ASK → GhostMarket.postOrder()
        - HOLD    → BrokerAgent.recordTick() only
        - PARTNER → no order, just tick (partnership handled separately)
        Returns the transaction hash.
        """
        if self._w3 is None:
            await self.connect()

        assert self._w3 is not None

        try:
            # Always record the tick for transparency
            tick_hash = await self._record_tick(token_id)
            logger.info("Tick recorded tx=%s for agent=%s", tick_hash, decision.agent_id)

            if decision.action in (ActionType.BID, ActionType.ASK):
                order_hash = await self._post_order(decision, token_id)
                logger.info(
                    "Order posted tx=%s agent=%s action=%s commodity=%s price=%s qty=%s",
                    order_hash, decision.agent_id, decision.action.value,
                    decision.commodity, decision.price, decision.qty,
                )
                return order_hash

            return tick_hash

        except Exception as exc:  # noqa: BLE001
            logger.error("write_decision failed: %s", exc)
            return None

    async def _post_order(self, decision: AgentDecision, token_id: int) -> str:
        assert self._w3 is not None
        contract = self._w3.eth.contract(
            address=self._w3.to_checksum_address(self._gm_addr),
            abi=[POST_ORDER_ABI],
        )

        side = 0 if decision.action == ActionType.BID else 1
        commodity_bytes32 = _commodity_to_bytes32(decision.commodity)
        price_wei = int(decision.price * 1e18)
        qty_wei   = int(decision.qty   * 1e18)

        nonce = await self._w3.eth.get_transaction_count(self._account.address)
        gas_price = await self._w3.eth.gas_price

        tx: TxParams = await contract.functions.postOrder(
            token_id,
            commodity_bytes32,
            side,
            price_wei,
            qty_wei,
            decision.ttl_blocks,
        ).build_transaction({
            "from":     self._account.address,
            "nonce":    nonce,
            "chainId":  CHAIN_ID,
            "gasPrice": gas_price,
        })

        signed = self._account.sign_transaction(tx)
        tx_hash = await self._w3.eth.send_raw_transaction(signed.raw_transaction)
        await self._w3.eth.wait_for_transaction_receipt(tx_hash, timeout=10)
        return tx_hash.hex()

    async def _record_tick(self, token_id: int) -> str:
        assert self._w3 is not None
        contract = self._w3.eth.contract(
            address=self._w3.to_checksum_address(self._ba_addr),
            abi=[RECORD_TICK_ABI],
        )

        nonce = await self._w3.eth.get_transaction_count(self._account.address)
        gas_price = await self._w3.eth.gas_price

        tx: TxParams = await contract.functions.recordTick(token_id).build_transaction({
            "from":     self._account.address,
            "nonce":    nonce,
            "chainId":  CHAIN_ID,
            "gasPrice": gas_price,
        })

        signed = self._account.sign_transaction(tx)
        tx_hash = await self._w3.eth.send_raw_transaction(signed.raw_transaction)
        await self._w3.eth.wait_for_transaction_receipt(tx_hash, timeout=10)
        return tx_hash.hex()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _commodity_to_bytes32(commodity: str) -> bytes:
    """Convert commodity name string to bytes32 keccak256 hash (matches Solidity)."""
    from web3 import Web3
    return Web3.keccak(text=commodity)
