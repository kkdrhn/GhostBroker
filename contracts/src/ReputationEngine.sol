// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ReputationEngine — Win-rate, profit-factor, drawdown scoring per agent
contract ReputationEngine is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE"); // MatchEngine

    // ── Types ──────────────────────────────────────────────────────────────────
    struct AgentStats {
        uint32  totalTrades;
        uint32  wins;
        uint32  losses;
        uint256 grossProfit;   // total capital gained across winning trades (18 dec)
        uint256 grossLoss;     // total capital lost across losing trades (18 dec)
        uint256 peakCapital;   // all-time high capital
        uint256 maxDrawdown;   // largest peak-to-trough drop (absolute, 18 dec)
        uint256 score;         // composite 0–10_000 (basis points)
        uint64  lastUpdated;
    }

    // ── State ──────────────────────────────────────────────────────────────────
    mapping(uint256 => AgentStats) private _stats;
    uint256[] private _allAgents; // list of agents that have any stat
    mapping(uint256 => bool) private _tracked;

    // Leaderboard: top-N by score (maintained lazily, sorted view via off-chain)
    uint256[] public leaderboard; // agentIds, not necessarily sorted here

    // ── Events ─────────────────────────────────────────────────────────────────
    event ScoreUpdated(uint256 indexed agentId, uint256 newScore, uint256 winRate, uint256 profitFactor);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ── Core ───────────────────────────────────────────────────────────────────

    /// @notice Called by MatchEngine after each trade settlement
    function recordTrade(
        uint256 agentId,
        uint256 newCapital,
        uint256 prevCapital,
        bool    won
    ) external onlyRole(RECORDER_ROLE) {
        AgentStats storage s = _stats[agentId];

        if (!_tracked[agentId]) {
            _tracked[agentId] = true;
            _allAgents.push(agentId);
            leaderboard.push(agentId);
        }

        unchecked { s.totalTrades++; }
        if (won) {
            unchecked { s.wins++; }
            if (newCapital > prevCapital) {
                unchecked { s.grossProfit += newCapital - prevCapital; }
            }
        } else {
            unchecked { s.losses++; }
            if (prevCapital > newCapital) {
                unchecked { s.grossLoss += prevCapital - newCapital; }
            }
        }

        // Update peak + drawdown
        if (newCapital > s.peakCapital) {
            s.peakCapital = newCapital;
        } else if (s.peakCapital > newCapital) {
            uint256 drawdown = s.peakCapital - newCapital;
            if (drawdown > s.maxDrawdown) {
                s.maxDrawdown = drawdown;
            }
        }

        s.score       = _computeScore(s);
        s.lastUpdated = uint64(block.timestamp);

        emit ScoreUpdated(agentId, s.score, winRate(agentId), profitFactor(agentId));
    }

    // ── Score Computation ──────────────────────────────────────────────────────

    /// @notice Composite score = 0.4*winRate + 0.4*profitFactor + 0.2*(1 - drawdownPct)
    ///         All in basis points (0–10_000).
    function _computeScore(AgentStats memory s) internal pure returns (uint256) {
        if (s.totalTrades == 0) return 0;

        // Win-rate component (0–10000)
        uint256 wr = (uint256(s.wins) * 10_000) / s.totalTrades;

        // Profit-factor component: grossProfit / grossLoss, capped at 3x = 10000
        uint256 pf;
        if (s.grossLoss == 0) {
            pf = s.grossProfit > 0 ? 10_000 : 5_000;
        } else {
            pf = s.grossProfit * 10_000 / s.grossLoss;
            if (pf > 30_000) pf = 30_000;         // cap at 3.0 profit factor
            pf = pf * 10_000 / 30_000;             // normalise to 0–10000
        }

        // Drawdown component: 1 - (maxDrawdown / peakCapital), normalised
        uint256 ddPct;
        if (s.peakCapital > 0) {
            ddPct = s.maxDrawdown * 10_000 / s.peakCapital;
        }
        uint256 ddScore = ddPct >= 10_000 ? 0 : 10_000 - ddPct;

        // Weighted composite
        return (wr * 40 + pf * 40 + ddScore * 20) / 100;
    }

    // ── Views ──────────────────────────────────────────────────────────────────
    function getStats(uint256 agentId) external view returns (AgentStats memory) {
        return _stats[agentId];
    }

    function winRate(uint256 agentId) public view returns (uint256) {
        AgentStats storage s = _stats[agentId];
        if (s.totalTrades == 0) return 0;
        return (uint256(s.wins) * 10_000) / s.totalTrades;
    }

    function profitFactor(uint256 agentId) public view returns (uint256) {
        AgentStats storage s = _stats[agentId];
        if (s.grossLoss == 0) return s.grossProfit > 0 ? type(uint256).max : 0;
        return s.grossProfit * 1e18 / s.grossLoss; // 18-dec fixed point
    }

    function getScore(uint256 agentId) external view returns (uint256) {
        return _stats[agentId].score;
    }

    function getAllAgents() external view returns (uint256[] memory) {
        return _allAgents;
    }

    /// @notice Returns APY multiplier for StakeVault: score 0-10000 → multiplier 100-300 (1x–3x)
    function apyMultiplier(uint256 agentId) external view returns (uint256) {
        uint256 s = _stats[agentId].score;
        // Linear: 100 + (score / 10000) * 200 = 100..300
        return 100 + (s * 200) / 10_000;
    }
}
