// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/GhostToken.sol";
import "../src/BrokerAgent.sol";
import "../src/ReputationEngine.sol";
import "../src/GhostMarket.sol";
import "../src/MatchEngine.sol";
import "../src/StakeVault.sol";
import "../src/PartnershipCovenant.sol";

/// @notice Full deployment script for Ghost Broker on Monad Testnet (Chain ID: 10143)
contract Deploy is Script {
    function run() external {
        address treasury = vm.envOr("TREASURY_ADDRESS", msg.sender);

        vm.startBroadcast();

        // 1. GhostToken
        GhostToken ghostToken = new GhostToken(treasury);
        console2.log("GhostToken      :", address(ghostToken));

        // 2. BrokerAgent NFT
        BrokerAgent brokerAgent = new BrokerAgent(address(ghostToken));
        console2.log("BrokerAgent     :", address(brokerAgent));

        // 3. ReputationEngine
        ReputationEngine reputationEngine = new ReputationEngine();
        console2.log("ReputationEngine:", address(reputationEngine));

        // 4. GhostMarket
        GhostMarket ghostMarket = new GhostMarket();
        console2.log("GhostMarket     :", address(ghostMarket));

        // 5. MatchEngine
        MatchEngine matchEngine = new MatchEngine(
            address(ghostMarket),
            address(brokerAgent),
            address(ghostToken),
            address(reputationEngine)
        );
        console2.log("MatchEngine     :", address(matchEngine));

        // 6. StakeVault
        StakeVault stakeVault = new StakeVault(address(ghostToken), address(reputationEngine));
        console2.log("StakeVault      :", address(stakeVault));

        // 7. PartnershipCovenant
        PartnershipCovenant covenant = new PartnershipCovenant(address(brokerAgent));
        console2.log("PartnershipCovenant:", address(covenant));

        // ── Wire permissions ────────────────────────────────────────────────────

        // BrokerAgent trusts MatchEngine for capital updates
        brokerAgent.setMatchEngine(address(matchEngine));

        // GhostMarket: AGENT_ROLE → deployer (demo), ENGINE_ROLE → MatchEngine
        ghostMarket.grantRole(ghostMarket.AGENT_ROLE(),  msg.sender);
        ghostMarket.grantRole(ghostMarket.ENGINE_ROLE(), address(matchEngine));

        // MatchEngine needs KEEPER_ROLE granted to off-chain keeper EOA
        matchEngine.grantRole(matchEngine.KEEPER_ROLE(), msg.sender);

        // ReputationEngine: RECORDER_ROLE → MatchEngine
        reputationEngine.grantRole(reputationEngine.RECORDER_ROLE(), address(matchEngine));

        // GhostToken: BURNER_ROLE → MatchEngine
        ghostToken.grantRole(ghostToken.BURNER_ROLE(), address(matchEngine));

        // Transfer initial GHOST to MatchEngine for fee pool
        uint256 seedAmount = 10_000 ether;
        if (treasury == msg.sender) {
            ghostToken.transfer(address(matchEngine), seedAmount);
        }

        vm.stopBroadcast();

        // ── Seed 5 demo BrokerAgents ────────────────────────────────────────────
        vm.startBroadcast();

        uint256 agentCapital = 1_000 ether;

        brokerAgent.mint(90, BrokerAgent.Strategy.AGGRESSIVE,   agentCapital);
        brokerAgent.mint(50, BrokerAgent.Strategy.BALANCED,     agentCapital);
        brokerAgent.mint(20, BrokerAgent.Strategy.CONSERVATIVE, agentCapital);
        brokerAgent.mint(95, BrokerAgent.Strategy.AGGRESSIVE,   agentCapital * 2);
        brokerAgent.mint(40, BrokerAgent.Strategy.BALANCED,     agentCapital / 2);

        console2.log("Seeded 5 demo BrokerAgents");

        vm.stopBroadcast();
    }
}
