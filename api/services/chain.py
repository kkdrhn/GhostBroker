"""
Shared on-chain reader — wraps Web3 calls for all routers.
"""
from __future__ import annotations

import os
from functools import lru_cache

from web3 import AsyncWeb3, HTTPProvider

MONAD_RPC  = os.getenv("MONAD_RPC_URL", "https://testnet-rpc.monad.xyz")
CHAIN_ID   = int(os.getenv("CHAIN_ID", "10143"))

# Contract addresses (set via .env)
ADDRESSES = {
    "GhostToken":          os.getenv("GHOST_TOKEN_ADDRESS",           ""),
    "BrokerAgent":         os.getenv("BROKER_AGENT_ADDRESS",          ""),
    "ReputationEngine":    os.getenv("REPUTATION_ENGINE_ADDRESS",      ""),
    "GhostMarket":         os.getenv("GHOST_MARKET_ADDRESS",           ""),
    "MatchEngine":         os.getenv("MATCH_ENGINE_ADDRESS",           ""),
    "StakeVault":          os.getenv("STAKE_VAULT_ADDRESS",            ""),
    "PartnershipCovenant": os.getenv("PARTNERSHIP_COVENANT_ADDRESS",   ""),
}


@lru_cache(maxsize=1)
def get_web3() -> AsyncWeb3:
    return AsyncWeb3(HTTPProvider(MONAD_RPC))
