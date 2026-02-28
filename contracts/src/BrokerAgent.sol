// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title BrokerAgent — ERC-721 NFT encoding an agent's risk DNA and lifecycle state
contract BrokerAgent is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // ── Types ──────────────────────────────────────────────────────────────────
    enum State { ACTIVE, ELITE, BANKRUPT, REVIVED }
    enum Strategy { AGGRESSIVE, BALANCED, CONSERVATIVE }

    struct AgentDNA {
        uint8      riskAppetite;   // 0-100
        Strategy   strategy;
        uint256    initialCapital; // in GHOST (18 decimals)
        uint256    capital;        // current capital, updated by MatchEngine
        State      state;
        uint32     winCount;
        uint32     lossCount;
        uint64     createdAt;      // block.timestamp
        uint64     lastTickAt;     // last time the off-chain brain submitted a decision
        address    ownerId;
    }

    // ── Constants ──────────────────────────────────────────────────────────────
    uint256 public constant ELITE_MULTIPLIER   = 10;  // 10x initial capital
    uint256 public constant REVIVAL_FEE        = 100 ether; // 100 GHOST
    uint256 public constant MINT_FEE           = 50 ether;  // 50 GHOST to mint

    // ── State ──────────────────────────────────────────────────────────────────
    uint256 private _nextTokenId = 1;
    address public  matchEngine;
    address public  ghostToken;

    mapping(uint256 => AgentDNA) private _dna;

    // ── Events ─────────────────────────────────────────────────────────────────
    event AgentMinted(uint256 indexed tokenId, address indexed owner, AgentDNA dna);
    event CapitalUpdated(uint256 indexed tokenId, uint256 newCapital, State newState);
    event AgentRevived(uint256 indexed tokenId, uint256 revivalFee);
    event TickRecorded(uint256 indexed tokenId, uint64 timestamp);

    // ── Modifiers ──────────────────────────────────────────────────────────────
    modifier onlyMatchEngine() {
        require(msg.sender == matchEngine, "BrokerAgent: only MatchEngine");
        _;
    }

    constructor(address _ghostToken) ERC721("BrokerAgent", "BAGT") Ownable(msg.sender) {
        ghostToken = _ghostToken;
    }

    // ── Admin ──────────────────────────────────────────────────────────────────
    function setMatchEngine(address _matchEngine) external onlyOwner {
        matchEngine = _matchEngine;
    }

    // ── Core ───────────────────────────────────────────────────────────────────

    /// @notice Mint a new BrokerAgent NFT with encoded risk DNA
    /// @param riskAppetite 0–100 risk score
    /// @param strategy     0=AGGRESSIVE 1=BALANCED 2=CONSERVATIVE
    /// @param initialCapital GHOST amount locked as starting capital
    function mint(
        uint8    riskAppetite,
        Strategy strategy,
        uint256  initialCapital
    ) external returns (uint256 tokenId) {
        require(riskAppetite <= 100, "BrokerAgent: riskAppetite > 100");
        require(initialCapital > 0,  "BrokerAgent: zero capital");

        tokenId = _nextTokenId++;

        AgentDNA memory dna = AgentDNA({
            riskAppetite:   riskAppetite,
            strategy:       strategy,
            initialCapital: initialCapital,
            capital:        initialCapital,
            state:          State.ACTIVE,
            winCount:       0,
            lossCount:      0,
            createdAt:      uint64(block.timestamp),
            lastTickAt:     0,
            ownerId:        msg.sender
        });

        _dna[tokenId] = dna;
        _safeMint(msg.sender, tokenId);

        emit AgentMinted(tokenId, msg.sender, dna);
    }

    /// @notice Called by MatchEngine after a trade settles — updates capital + state
    function updateCapital(
        uint256 tokenId,
        uint256 newCapital,
        bool    won
    ) external onlyMatchEngine {
        AgentDNA storage dna = _dna[tokenId];
        require(dna.state != State.BANKRUPT, "BrokerAgent: agent bankrupt");

        dna.capital = newCapital;

        if (won) {
            unchecked { dna.winCount++; }
        } else {
            unchecked { dna.lossCount++; }
        }

        // State machine transitions
        if (newCapital == 0) {
            dna.state = State.BANKRUPT;
        } else if (newCapital >= dna.initialCapital * ELITE_MULTIPLIER) {
            dna.state = State.ELITE;
        } else if (dna.state == State.REVIVED) {
            // stays REVIVED until ELITE threshold
        } else {
            dna.state = State.ACTIVE;
        }

        emit CapitalUpdated(tokenId, newCapital, dna.state);
    }

    /// @notice Owner pays revival fee (in GHOST, pre-approved) to unlock a BANKRUPT agent
    function revive(uint256 tokenId, uint256 newCapital) external {
        AgentDNA storage dna = _dna[tokenId];
        require(ownerOf(tokenId) == msg.sender, "BrokerAgent: not owner");
        require(dna.state == State.BANKRUPT,     "BrokerAgent: not bankrupt");
        require(newCapital > 0,                  "BrokerAgent: zero capital");

        // Caller must have transferred GHOST externally before calling
        dna.state   = State.REVIVED;
        dna.capital = newCapital;

        emit AgentRevived(tokenId, REVIVAL_FEE);
    }

    /// @notice Record off-chain brain tick timestamp (called by Monoracle writer)
    function recordTick(uint256 tokenId) external {
        require(_ownerOf(tokenId) != address(0), "BrokerAgent: nonexistent");
        _dna[tokenId].lastTickAt = uint64(block.timestamp);
        emit TickRecorded(tokenId, uint64(block.timestamp));
    }

    // ── Views ──────────────────────────────────────────────────────────────────
    function getDNA(uint256 tokenId) external view returns (AgentDNA memory) {
        require(_ownerOf(tokenId) != address(0), "BrokerAgent: nonexistent");
        return _dna[tokenId];
    }

    function getState(uint256 tokenId) external view returns (State) {
        return _dna[tokenId].state;
    }

    function isElite(uint256 tokenId) external view returns (bool) {
        return _dna[tokenId].state == State.ELITE;
    }

    function isBankrupt(uint256 tokenId) external view returns (bool) {
        return _dna[tokenId].state == State.BANKRUPT;
    }

    /// @notice Agents cannot be transferred while BANKRUPT (NFT locked)
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        AgentDNA storage dna = _dna[tokenId];
        if (dna.state == State.BANKRUPT && to != address(0)) {
            revert("BrokerAgent: locked — agent bankrupt");
        }
        return super._update(to, tokenId, auth);
    }
}
