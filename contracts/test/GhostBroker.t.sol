// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/GhostToken.sol";
import "../src/BrokerAgent.sol";
import "../src/ReputationEngine.sol";
import "../src/GhostMarket.sol";
import "../src/MatchEngine.sol";
import "../src/StakeVault.sol";
import "../src/PartnershipCovenant.sol";

contract GhostBrokerTest is Test {
    GhostToken          ghostToken;
    BrokerAgent         brokerAgent;
    ReputationEngine    reputationEngine;
    GhostMarket         ghostMarket;
    MatchEngine         matchEngine;
    StakeVault          stakeVault;
    PartnershipCovenant covenant;

    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    function setUp() public {
        ghostToken       = new GhostToken(address(this));
        brokerAgent      = new BrokerAgent(address(ghostToken));
        reputationEngine = new ReputationEngine();
        ghostMarket      = new GhostMarket();
        matchEngine      = new MatchEngine(
            address(ghostMarket),
            address(brokerAgent),
            address(ghostToken),
            address(reputationEngine)
        );
        stakeVault  = new StakeVault(address(ghostToken), address(reputationEngine));
        covenant    = new PartnershipCovenant(address(brokerAgent));

        // Wire
        brokerAgent.setMatchEngine(address(matchEngine));
        ghostMarket.grantRole(ghostMarket.AGENT_ROLE(),  address(this));
        ghostMarket.grantRole(ghostMarket.ENGINE_ROLE(), address(matchEngine));
        reputationEngine.grantRole(reputationEngine.RECORDER_ROLE(), address(matchEngine));
        ghostToken.grantRole(ghostToken.BURNER_ROLE(), address(matchEngine));
        matchEngine.grantRole(matchEngine.KEEPER_ROLE(), address(this));

        // Fund test actors
        ghostToken.transfer(alice, 10_000 ether);
        ghostToken.transfer(bob,   10_000 ether);
        ghostToken.transfer(address(matchEngine), 1_000 ether);
    }

    // ── BrokerAgent Tests ──────────────────────────────────────────────────────
    function test_MintAgent() public {
        vm.prank(alice);
        uint256 tokenId = brokerAgent.mint(80, BrokerAgent.Strategy.AGGRESSIVE, 500 ether);
        assertEq(brokerAgent.ownerOf(tokenId), alice);
        BrokerAgent.AgentDNA memory dna = brokerAgent.getDNA(tokenId);
        assertEq(dna.riskAppetite, 80);
        assertEq(dna.capital, 500 ether);
        assertEq(uint8(dna.state), uint8(BrokerAgent.State.ACTIVE));
    }

    function test_AgentBankruptcy() public {
        vm.prank(alice);
        uint256 tokenId = brokerAgent.mint(50, BrokerAgent.Strategy.BALANCED, 100 ether);

        // MatchEngine zeroes out capital
        brokerAgent.updateCapital(tokenId, 0, false);
        assertEq(uint8(brokerAgent.getState(tokenId)), uint8(BrokerAgent.State.BANKRUPT));

        // Locked — cannot transfer
        vm.prank(alice);
        vm.expectRevert("BrokerAgent: locked — agent bankrupt");
        brokerAgent.transferFrom(alice, bob, tokenId);
    }

    function test_AgentRevival() public {
        vm.prank(alice);
        uint256 tokenId = brokerAgent.mint(50, BrokerAgent.Strategy.BALANCED, 100 ether);
        brokerAgent.updateCapital(tokenId, 0, false);
        assertTrue(brokerAgent.isBankrupt(tokenId));

        vm.prank(alice);
        brokerAgent.revive(tokenId, 200 ether);
        assertEq(uint8(brokerAgent.getState(tokenId)), uint8(BrokerAgent.State.REVIVED));
    }

    function test_ElitePromotion() public {
        vm.prank(alice);
        uint256 tokenId = brokerAgent.mint(50, BrokerAgent.Strategy.BALANCED, 100 ether);
        // 10x initial = 1000 ether → ELITE
        brokerAgent.updateCapital(tokenId, 1_000 ether, true);
        assertTrue(brokerAgent.isElite(tokenId));
    }

    // ── GhostMarket Tests ──────────────────────────────────────────────────────
    function test_PostAndCancelOrder() public {
        vm.prank(alice);
        uint256 agentId = brokerAgent.mint(50, BrokerAgent.Strategy.BALANCED, 500 ether);

        bytes32 orderId = ghostMarket.postOrder(
            agentId, GhostMarket.GHOST_ORE, GhostMarket.OrderSide.BID,
            1 ether, 10 ether, 50
        );

        GhostMarket.Order memory o = ghostMarket.getOrder(orderId);
        assertEq(uint8(o.status), uint8(GhostMarket.OrderStatus.OPEN));

        vm.prank(alice);
        ghostMarket.cancelOrder(orderId);
        o = ghostMarket.getOrder(orderId);
        assertEq(uint8(o.status), uint8(GhostMarket.OrderStatus.CANCELLED));
    }

    function test_OrderExpiry() public {
        vm.prank(alice);
        uint256 agentId = brokerAgent.mint(50, BrokerAgent.Strategy.BALANCED, 500 ether);

        bytes32 orderId = ghostMarket.postOrder(
            agentId, GhostMarket.GHOST_ORE, GhostMarket.OrderSide.BID,
            1 ether, 10 ether, 5 // 5 block TTL
        );

        vm.roll(block.number + 10); // advance 10 blocks
        bytes32[] memory ids = new bytes32[](1);
        ids[0] = orderId;
        ghostMarket.expireOrders(ids);

        GhostMarket.Order memory o = ghostMarket.getOrder(orderId);
        assertEq(uint8(o.status), uint8(GhostMarket.OrderStatus.EXPIRED));
    }

    // ── MatchEngine Tests ──────────────────────────────────────────────────────
    function test_TradeMatch() public {
        vm.prank(alice);
        uint256 agentA = brokerAgent.mint(80, BrokerAgent.Strategy.AGGRESSIVE, 1_000 ether);
        vm.prank(bob);
        uint256 agentB = brokerAgent.mint(20, BrokerAgent.Strategy.CONSERVATIVE, 1_000 ether);

        // Post matching bid + ask
        ghostMarket.postOrder(agentA, GhostMarket.GHOST_ORE, GhostMarket.OrderSide.BID, 2 ether, 5 ether, 50);
        ghostMarket.postOrder(agentB, GhostMarket.GHOST_ORE, GhostMarket.OrderSide.ASK, 2 ether, 5 ether, 50);

        bytes32[] memory commodities = new bytes32[](1);
        commodities[0] = GhostMarket.GHOST_ORE;

        uint256 matched = matchEngine.processBatch(commodities, 10);
        assertEq(matched, 1);
        assertEq(matchEngine.totalMatchedTrades(), 1);
    }

    // ── Partnership Tests ──────────────────────────────────────────────────────
    function test_PartnershipLifecycle() public {
        vm.prank(alice);
        uint256 agentA = brokerAgent.mint(60, BrokerAgent.Strategy.BALANCED, 500 ether);
        vm.prank(bob);
        uint256 agentB = brokerAgent.mint(40, BrokerAgent.Strategy.CONSERVATIVE, 500 ether);

        vm.prank(alice);
        uint256 covenantId = covenant.propose(agentA, agentB, 6000); // 60/40 split

        vm.prank(bob);
        covenant.accept(covenantId);

        PartnershipCovenant.Covenant memory c = covenant.getCovenant(covenantId);
        assertEq(uint8(c.status), uint8(PartnershipCovenant.CovenantStatus.ACTIVE));
        assertEq(c.profitSplitA, 6000);
        assertEq(c.profitSplitB, 4000);

        vm.prank(alice);
        covenant.dissolve(covenantId);
        c = covenant.getCovenant(covenantId);
        assertEq(uint8(c.status), uint8(PartnershipCovenant.CovenantStatus.DISSOLVED));
    }

    // ── StakeVault Tests ───────────────────────────────────────────────────────
    function test_StakeAndClaim() public {
        vm.prank(alice);
        uint256 agentId = brokerAgent.mint(50, BrokerAgent.Strategy.BALANCED, 500 ether);

        vm.startPrank(alice);
        ghostToken.approve(address(stakeVault), 1_000 ether);
        stakeVault.deposit(agentId, 1_000 ether);
        vm.stopPrank();

        // Owner distributes profit
        ghostToken.approve(address(stakeVault), 100 ether);
        ghostToken.transfer(address(stakeVault), 100 ether);
        stakeVault.distributeProfit(agentId, 100 ether, alice);

        uint256 pending = stakeVault.pendingRewards(agentId, alice);
        assertGt(pending, 0);
    }
}
