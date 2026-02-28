// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./GhostMarket.sol";
import "./BrokerAgent.sol";
import "./GhostToken.sol";
import "./ReputationEngine.sol";

/// @title MatchEngine — Price-time priority matching with Monad parallel-safe design
/// @notice Processes up to MAX_MATCHES agent-to-agent trades per batch (per-block call)
contract MatchEngine is AccessControl {
    bytes32 public constant KEEPER_ROLE  = keccak256("KEEPER_ROLE");

    uint256 public constant MAX_MATCHES  = 500;
    uint256 public constant BURN_FEE_BPS = 10; // 0.10% of trade value burned as GHOST

    // ── Contracts ──────────────────────────────────────────────────────────────
    GhostMarket       public ghostMarket;
    BrokerAgent       public brokerAgent;
    GhostToken        public ghostToken;
    ReputationEngine  public reputationEngine;

    // ── Types ──────────────────────────────────────────────────────────────────
    struct MatchResult {
        bytes32 bidOrderId;
        bytes32 askOrderId;
        uint256 agentBid;
        uint256 agentAsk;
        bytes32 commodity;
        uint256 matchedQty;
        uint256 matchedPrice;
        uint256 feeBurned;
        uint64  blockNumber;
        uint64  timestamp;
    }

    // ── State ──────────────────────────────────────────────────────────────────
    MatchResult[] private _matchHistory;
    mapping(uint64 => uint256[]) private _matchesByBlock; // blockNumber => indices into _matchHistory

    uint256 public totalMatchedTrades;
    uint256 public totalVolume; // in GHOST

    // ── Events ─────────────────────────────────────────────────────────────────
    event TradeMatched(
        bytes32 indexed bidOrderId,
        bytes32 indexed askOrderId,
        uint256 indexed agentBid,
        uint256 agentAsk,
        bytes32 commodity,
        uint256 qty,
        uint256 price,
        uint256 feeBurned
    );
    event BatchProcessed(uint64 blockNumber, uint256 matchCount);

    constructor(
        address _ghostMarket,
        address _brokerAgent,
        address _ghostToken,
        address _reputationEngine
    ) {
        ghostMarket      = GhostMarket(_ghostMarket);
        brokerAgent      = BrokerAgent(_brokerAgent);
        ghostToken       = GhostToken(_ghostToken);
        reputationEngine = ReputationEngine(_reputationEngine);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ── Batch Matching ─────────────────────────────────────────────────────────

    /// @notice Process up to `maxMatches` matches across all commodities in one tx
    /// @dev Monad parallel execution: multiple keepers can call concurrently on different commodities
    function processBatch(
        bytes32[] calldata commodities,
        uint256   maxMatches
    ) external onlyRole(KEEPER_ROLE) returns (uint256 matchCount) {
        require(maxMatches <= MAX_MATCHES, "MatchEngine: exceeds MAX_MATCHES");

        for (uint256 c; c < commodities.length && matchCount < maxMatches; ++c) {
            matchCount += _matchCommodity(commodities[c], maxMatches - matchCount);
        }

        emit BatchProcessed(uint64(block.number), matchCount);
    }

    /// @notice Match a single commodity's best bid against best ask (called internally)
    function _matchCommodity(
        bytes32 commodity,
        uint256 maxMatches
    ) internal returns (uint256 count) {
        bytes32[] memory bids = ghostMarket.getBidOrderIds(commodity);
        bytes32[] memory asks = ghostMarket.getAskOrderIds(commodity);

        if (bids.length == 0 || asks.length == 0) return 0;

        // Find best bid (highest price) and best ask (lowest price)
        // In production this is maintained via a sorted structure; here we scan for demo
        (bytes32 bestBidId, uint256 bestBidPrice) = _findBestBid(bids);
        (bytes32 bestAskId, uint256 bestAskPrice) = _findBestAsk(asks);

        while (
            bestBidId != bytes32(0) &&
            bestAskId != bytes32(0) &&
            bestBidPrice >= bestAskPrice &&
            count < maxMatches
        ) {
            GhostMarket.Order memory bid = ghostMarket.getOrder(bestBidId);
            GhostMarket.Order memory ask = ghostMarket.getOrder(bestAskId);

            if (bid.status != GhostMarket.OrderStatus.OPEN || ask.status != GhostMarket.OrderStatus.OPEN) break;

            // Check TTL
            if (block.number > bid.createdBlock + bid.ttlBlocks) break;
            if (block.number > ask.createdBlock + ask.ttlBlocks) break;

            uint256 matchQty      = _min(bid.qty - bid.filledQty, ask.qty - ask.filledQty);
            uint256 matchPrice    = bestBidPrice; // price-time: aggressor pays bid price
            uint256 tradeValue    = matchQty * matchPrice / 1e18;
            uint256 fee           = tradeValue * BURN_FEE_BPS / 10_000;

            // Burn micro-fee
            if (fee > 0 && ghostToken.balanceOf(address(this)) >= fee) {
                ghostToken.burnFee(fee);
            }

            // Fill orders
            ghostMarket.fillOrder(bestBidId, matchQty);
            ghostMarket.fillOrder(bestAskId, matchQty);

            // Update agent capitals
            _settleAgentCapitals(bid.agentId, ask.agentId, tradeValue, fee);

            // Record match
            MatchResult memory result = MatchResult({
                bidOrderId:   bestBidId,
                askOrderId:   bestAskId,
                agentBid:     bid.agentId,
                agentAsk:     ask.agentId,
                commodity:    commodity,
                matchedQty:   matchQty,
                matchedPrice: matchPrice,
                feeBurned:    fee,
                blockNumber:  uint64(block.number),
                timestamp:    uint64(block.timestamp)
            });

            uint256 idx = _matchHistory.length;
            _matchHistory.push(result);
            _matchesByBlock[uint64(block.number)].push(idx);

            unchecked {
                totalMatchedTrades++;
                totalVolume += tradeValue;
                count++;
            }

            emit TradeMatched(
                bestBidId, bestAskId,
                bid.agentId, ask.agentId,
                commodity, matchQty, matchPrice, fee
            );

            // Refresh best bid/ask for next iteration
            bids = ghostMarket.getBidOrderIds(commodity);
            asks = ghostMarket.getAskOrderIds(commodity);
            if (bids.length == 0 || asks.length == 0) break;
            (bestBidId, bestBidPrice) = _findBestBid(bids);
            (bestAskId, bestAskPrice) = _findBestAsk(asks);
        }
    }

    function _settleAgentCapitals(
        uint256 agentBid,
        uint256 agentAsk,
        uint256 tradeValue,
        uint256 fee
    ) internal {
        BrokerAgent.AgentDNA memory bidDNA = brokerAgent.getDNA(agentBid);
        BrokerAgent.AgentDNA memory askDNA = brokerAgent.getDNA(agentAsk);

        // Bid agent pays, ask agent receives (simplified: trade value moves)
        uint256 bidNewCapital = bidDNA.capital >= tradeValue + fee
            ? bidDNA.capital - tradeValue - fee
            : 0;
        uint256 askNewCapital = askDNA.capital + tradeValue - fee;

        bool bidWon = askNewCapital > askDNA.capital; // ask agent gained
        bool askWon = true;

        brokerAgent.updateCapital(agentBid, bidNewCapital, !bidWon);
        brokerAgent.updateCapital(agentAsk, askNewCapital, askWon);

        // Update reputation
        reputationEngine.recordTrade(agentBid, bidNewCapital, bidDNA.capital, !bidWon);
        reputationEngine.recordTrade(agentAsk, askNewCapital, askDNA.capital, askWon);
    }

    // ── Views ──────────────────────────────────────────────────────────────────
    function getMatchHistory(uint256 offset, uint256 limit) external view returns (MatchResult[] memory) {
        uint256 total = _matchHistory.length;
        if (offset >= total) return new MatchResult[](0);
        uint256 end = _min(offset + limit, total);
        MatchResult[] memory page = new MatchResult[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            page[i - offset] = _matchHistory[i];
        }
        return page;
    }

    function getMatchesByBlock(uint64 blockNumber) external view returns (MatchResult[] memory) {
        uint256[] storage indices = _matchesByBlock[blockNumber];
        MatchResult[] memory results = new MatchResult[](indices.length);
        for (uint256 i; i < indices.length; ++i) {
            results[i] = _matchHistory[indices[i]];
        }
        return results;
    }

    function getStats() external view returns (uint256 trades, uint256 volume) {
        return (totalMatchedTrades, totalVolume);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    function _findBestBid(bytes32[] memory orderIds)
        internal view returns (bytes32 bestId, uint256 bestPrice)
    {
        for (uint256 i; i < orderIds.length; ++i) {
            GhostMarket.Order memory o = ghostMarket.getOrder(orderIds[i]);
            if (o.status == GhostMarket.OrderStatus.OPEN && o.price > bestPrice) {
                bestPrice = o.price;
                bestId    = o.orderId;
            }
        }
    }

    function _findBestAsk(bytes32[] memory orderIds)
        internal view returns (bytes32 bestId, uint256 bestPrice)
    {
        bestPrice = type(uint256).max;
        for (uint256 i; i < orderIds.length; ++i) {
            GhostMarket.Order memory o = ghostMarket.getOrder(orderIds[i]);
            if (o.status == GhostMarket.OrderStatus.OPEN && o.price < bestPrice) {
                bestPrice = o.price;
                bestId    = o.orderId;
            }
        }
        if (bestId == bytes32(0)) bestPrice = 0;
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
