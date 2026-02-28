// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BrokerAgent.sol";

/// @title PartnershipCovenant — Merges capital pools of two agents, splits profits on-chain
contract PartnershipCovenant is Ownable, ReentrancyGuard {

    // ── Types ──────────────────────────────────────────────────────────────────
    enum CovenantStatus { PROPOSED, ACTIVE, DISSOLVED }

    struct Covenant {
        uint256 covenantId;
        uint256 agentA;
        uint256 agentB;
        uint256 capitalA;        // capital contributed by A at formation
        uint256 capitalB;        // capital contributed by B at formation
        uint256 profitSplitA;    // basis points (out of 10000) of profit to A
        uint256 profitSplitB;    // basis points (out of 10000) of profit to B
        CovenantStatus status;
        uint64  proposedAt;
        uint64  activatedAt;
        uint64  dissolvedAt;
        uint256 totalProfitDistributed;
    }

    // ── State ──────────────────────────────────────────────────────────────────
    BrokerAgent public brokerAgent;

    uint256 private _nextCovenantId = 1;
    mapping(uint256 => Covenant) private _covenants;
    mapping(uint256 => uint256) public agentActiveCovenant; // agentId => covenantId (0 = none)
    uint256[] private _allCovenants;

    // ── Events ─────────────────────────────────────────────────────────────────
    event CovenantProposed(uint256 indexed covenantId, uint256 indexed agentA, uint256 indexed agentB, uint256 splitA, uint256 splitB);
    event CovenantActivated(uint256 indexed covenantId);
    event CovenantDissolved(uint256 indexed covenantId, uint256 timestamp);
    event ProfitDistributed(uint256 indexed covenantId, uint256 amountA, uint256 amountB);

    constructor(address _brokerAgent) Ownable(msg.sender) {
        brokerAgent = BrokerAgent(_brokerAgent);
    }

    // ── Core ───────────────────────────────────────────────────────────────────

    /// @notice Agent A's owner proposes a partnership with Agent B
    /// @param agentA       NFT id of proposer's agent
    /// @param agentB       NFT id of target agent
    /// @param profitSplitA share of profit to A in basis points (e.g. 6000 = 60%)
    function propose(
        uint256 agentA,
        uint256 agentB,
        uint256 profitSplitA
    ) external returns (uint256 covenantId) {
        require(brokerAgent.ownerOf(agentA) == msg.sender, "Covenant: not owner of agentA");
        require(agentA != agentB,                            "Covenant: same agent");
        require(profitSplitA <= 10_000,                      "Covenant: invalid split");
        require(!brokerAgent.isBankrupt(agentA),             "Covenant: agentA bankrupt");
        require(!brokerAgent.isBankrupt(agentB),             "Covenant: agentB bankrupt");
        require(agentActiveCovenant[agentA] == 0,            "Covenant: agentA in covenant");
        require(agentActiveCovenant[agentB] == 0,            "Covenant: agentB in covenant");

        uint256 profitSplitB = 10_000 - profitSplitA;

        BrokerAgent.AgentDNA memory dnaA = brokerAgent.getDNA(agentA);
        BrokerAgent.AgentDNA memory dnaB = brokerAgent.getDNA(agentB);

        covenantId = _nextCovenantId++;

        _covenants[covenantId] = Covenant({
            covenantId:              covenantId,
            agentA:                  agentA,
            agentB:                  agentB,
            capitalA:                dnaA.capital,
            capitalB:                dnaB.capital,
            profitSplitA:            profitSplitA,
            profitSplitB:            profitSplitB,
            status:                  CovenantStatus.PROPOSED,
            proposedAt:              uint64(block.timestamp),
            activatedAt:             0,
            dissolvedAt:             0,
            totalProfitDistributed:  0
        });
        _allCovenants.push(covenantId);

        emit CovenantProposed(covenantId, agentA, agentB, profitSplitA, profitSplitB);
    }

    /// @notice Agent B's owner accepts the proposal, activating the covenant
    function accept(uint256 covenantId) external {
        Covenant storage c = _covenants[covenantId];
        require(c.status == CovenantStatus.PROPOSED, "Covenant: not proposed");
        require(brokerAgent.ownerOf(c.agentB) == msg.sender, "Covenant: not owner of agentB");
        require(!brokerAgent.isBankrupt(c.agentB), "Covenant: agentB bankrupt");
        require(agentActiveCovenant[c.agentA] == 0, "Covenant: agentA now in covenant");
        require(agentActiveCovenant[c.agentB] == 0, "Covenant: agentB now in covenant");

        c.status      = CovenantStatus.ACTIVE;
        c.activatedAt = uint64(block.timestamp);

        agentActiveCovenant[c.agentA] = covenantId;
        agentActiveCovenant[c.agentB] = covenantId;

        emit CovenantActivated(covenantId);
    }

    /// @notice Either partner can dissolve the covenant
    function dissolve(uint256 covenantId) external nonReentrant {
        Covenant storage c = _covenants[covenantId];
        require(c.status == CovenantStatus.ACTIVE, "Covenant: not active");
        address ownerA = brokerAgent.ownerOf(c.agentA);
        address ownerB = brokerAgent.ownerOf(c.agentB);
        require(msg.sender == ownerA || msg.sender == ownerB, "Covenant: not a partner");

        c.status      = CovenantStatus.DISSOLVED;
        c.dissolvedAt = uint64(block.timestamp);

        delete agentActiveCovenant[c.agentA];
        delete agentActiveCovenant[c.agentB];

        emit CovenantDissolved(covenantId, block.timestamp);
    }

    /// @notice Called by keeper/MatchEngine to split a profit amount per covenant rules
    /// @dev    Profit must be pre-transferred; this records distribution on-chain
    function distributeProfit(uint256 covenantId, uint256 profit) external onlyOwner {
        Covenant storage c = _covenants[covenantId];
        require(c.status == CovenantStatus.ACTIVE, "Covenant: not active");
        require(profit > 0, "Covenant: zero profit");

        uint256 amountA = profit * c.profitSplitA / 10_000;
        uint256 amountB = profit - amountA;

        unchecked { c.totalProfitDistributed += profit; }

        emit ProfitDistributed(covenantId, amountA, amountB);
    }

    // ── Views ──────────────────────────────────────────────────────────────────
    function getCovenant(uint256 covenantId) external view returns (Covenant memory) {
        return _covenants[covenantId];
    }

    function getActiveCovenant(uint256 agentId) external view returns (Covenant memory) {
        uint256 id = agentActiveCovenant[agentId];
        return _covenants[id];
    }

    function getAllCovenants() external view returns (uint256[] memory) {
        return _allCovenants;
    }

    function mergedCapital(uint256 covenantId) external view returns (uint256) {
        Covenant storage c = _covenants[covenantId];
        return c.capitalA + c.capitalB;
    }
}
