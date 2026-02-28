// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title GhostMarket — Fully on-chain order book for Ghost Broker commodities
/// @notice Supports GHOST_ORE, PHANTOM_GAS, VOID_CHIP + live memecoin price indices
contract GhostMarket is AccessControl {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    bytes32 public constant AGENT_ROLE  = keccak256("AGENT_ROLE");
    bytes32 public constant ENGINE_ROLE = keccak256("ENGINE_ROLE");

    // ── Types ──────────────────────────────────────────────────────────────────
    enum OrderSide   { BID, ASK }
    enum OrderStatus { OPEN, MATCHED, EXPIRED, CANCELLED }

    struct Order {
        bytes32     orderId;
        uint256     agentId;       // BrokerAgent NFT id
        address     agentOwner;
        bytes32     commodity;     // keccak256 of commodity name
        OrderSide   side;
        uint256     price;         // price in GHOST (18 dec), per unit
        uint256     qty;           // quantity in commodity units (18 dec)
        uint256     filledQty;
        OrderStatus status;
        uint64      ttlBlocks;     // expiry = createdBlock + ttlBlocks
        uint64      createdBlock;
        uint64      createdAt;
    }

    // ── Constants ──────────────────────────────────────────────────────────────
    bytes32 public constant GHOST_ORE    = keccak256("GHOST_ORE");
    bytes32 public constant PHANTOM_GAS  = keccak256("PHANTOM_GAS");
    bytes32 public constant VOID_CHIP    = keccak256("VOID_CHIP");
    bytes32 public constant MON_USDC     = keccak256("MON_USDC");

    uint64  public constant DEFAULT_TTL  = 50; // ~20 seconds on Monad (400ms blocks)
    uint64  public constant MAX_TTL      = 7200; // ~48 minutes

    // ── State ──────────────────────────────────────────────────────────────────
    mapping(bytes32 => Order) private _orders;
    // commodity => side => ordered list of orderIds (price-time priority maintained off-chain, snapshot on-chain)
    mapping(bytes32 => EnumerableSet.Bytes32Set) private _bidOrders;
    mapping(bytes32 => EnumerableSet.Bytes32Set) private _askOrders;
    // agentId => open orderIds
    mapping(uint256 => EnumerableSet.Bytes32Set) private _agentOrders;

    uint256 private _orderNonce;

    // ── Events ─────────────────────────────────────────────────────────────────
    event OrderPosted(
        bytes32 indexed orderId,
        uint256 indexed agentId,
        bytes32 indexed commodity,
        OrderSide side,
        uint256 price,
        uint256 qty,
        uint64  ttlBlocks
    );
    event OrderCancelled(bytes32 indexed orderId, uint256 indexed agentId);
    event OrderExpired(bytes32 indexed orderId);
    event OrderFilled(bytes32 indexed orderId, uint256 filledQty, uint256 remainingQty);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ── Core ───────────────────────────────────────────────────────────────────

    /// @notice Post a new bid or ask order on behalf of a BrokerAgent
    function postOrder(
        uint256   agentId,
        bytes32   commodity,
        OrderSide side,
        uint256   price,
        uint256   qty,
        uint64    ttlBlocks
    ) external onlyRole(AGENT_ROLE) returns (bytes32 orderId) {
        require(price > 0,  "GhostMarket: zero price");
        require(qty > 0,    "GhostMarket: zero qty");
        require(_isSupportedCommodity(commodity), "GhostMarket: unsupported commodity");
        uint64 ttl = ttlBlocks == 0 ? DEFAULT_TTL : ttlBlocks;
        require(ttl <= MAX_TTL, "GhostMarket: TTL too long");

        unchecked { _orderNonce++; }
        orderId = keccak256(abi.encodePacked(agentId, commodity, side, price, qty, block.number, _orderNonce));

        _orders[orderId] = Order({
            orderId:      orderId,
            agentId:      agentId,
            agentOwner:   msg.sender,
            commodity:    commodity,
            side:         side,
            price:        price,
            qty:          qty,
            filledQty:    0,
            status:       OrderStatus.OPEN,
            ttlBlocks:    ttl,
            createdBlock: uint64(block.number),
            createdAt:    uint64(block.timestamp)
        });

        if (side == OrderSide.BID) {
            _bidOrders[commodity].add(orderId);
        } else {
            _askOrders[commodity].add(orderId);
        }
        _agentOrders[agentId].add(orderId);

        emit OrderPosted(orderId, agentId, commodity, side, price, qty, ttl);
    }

    /// @notice Called by MatchEngine after a match — updates fill quantities
    function fillOrder(
        bytes32 orderId,
        uint256 fillQty
    ) external onlyRole(ENGINE_ROLE) {
        Order storage o = _orders[orderId];
        require(o.status == OrderStatus.OPEN, "GhostMarket: not open");
        require(fillQty <= o.qty - o.filledQty, "GhostMarket: overfill");

        o.filledQty += fillQty;
        if (o.filledQty == o.qty) {
            o.status = OrderStatus.MATCHED;
            _removeFromBooks(o);
        }
        emit OrderFilled(orderId, fillQty, o.qty - o.filledQty);
    }

    /// @notice Agent owner cancels an open order
    function cancelOrder(bytes32 orderId) external {
        Order storage o = _orders[orderId];
        require(o.agentOwner == msg.sender, "GhostMarket: not owner");
        require(o.status == OrderStatus.OPEN, "GhostMarket: not open");

        o.status = OrderStatus.CANCELLED;
        _removeFromBooks(o);
        _agentOrders[o.agentId].remove(orderId);

        emit OrderCancelled(orderId, o.agentId);
    }

    /// @notice Sweep expired orders (callable by anyone, gasless incentive can be added)
    function expireOrders(bytes32[] calldata orderIds) external {
        for (uint256 i; i < orderIds.length; ++i) {
            Order storage o = _orders[orderIds[i]];
            if (
                o.status == OrderStatus.OPEN &&
                block.number > o.createdBlock + o.ttlBlocks
            ) {
                o.status = OrderStatus.EXPIRED;
                _removeFromBooks(o);
                _agentOrders[o.agentId].remove(o.orderId);
                emit OrderExpired(o.orderId);
            }
        }
    }

    // ── Views ──────────────────────────────────────────────────────────────────
    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return _orders[orderId];
    }

    function getBidOrderIds(bytes32 commodity) external view returns (bytes32[] memory) {
        return _bidOrders[commodity].values();
    }

    function getAskOrderIds(bytes32 commodity) external view returns (bytes32[] memory) {
        return _askOrders[commodity].values();
    }

    function getAgentOpenOrders(uint256 agentId) external view returns (bytes32[] memory) {
        return _agentOrders[agentId].values();
    }

    function getBidDepth(bytes32 commodity) external view returns (uint256) {
        return _bidOrders[commodity].length();
    }

    function getAskDepth(bytes32 commodity) external view returns (uint256) {
        return _askOrders[commodity].length();
    }

    // ── Internal ───────────────────────────────────────────────────────────────
    function _removeFromBooks(Order storage o) internal {
        if (o.side == OrderSide.BID) {
            _bidOrders[o.commodity].remove(o.orderId);
        } else {
            _askOrders[o.commodity].remove(o.orderId);
        }
    }

    function _isSupportedCommodity(bytes32 c) internal pure returns (bool) {
        return c == GHOST_ORE || c == PHANTOM_GAS || c == VOID_CHIP || c == MON_USDC;
    }
}
