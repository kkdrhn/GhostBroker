// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationEngine.sol";

/// @title StakeVault — ERC-4626 variant: per-agent GHOST staking with profit split
/// @notice 70% of agent profit → agent owner, 30% → stakers (pro-rata by shares)
///         Staking APY multiplier is determined by the agent's ReputationEngine score.
contract StakeVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Types ──────────────────────────────────────────────────────────────────
    struct VaultInfo {
        uint256 totalShares;       // total LP shares issued
        uint256 totalDeposited;    // GHOST deposited by stakers
        uint256 totalRewards;      // cumulative rewards distributed
        uint256 rewardPerShare;    // accumulated reward per share (scaled 1e18)
        bool    exists;
    }

    struct StakerPosition {
        uint256 shares;
        uint256 rewardDebt;        // rewardPerShare snapshot at last action
        uint256 pendingRewards;    // unclaimed GHOST rewards
    }

    // ── Constants ──────────────────────────────────────────────────────────────
    uint256 public constant OWNER_SHARE    = 70; // 70% of profit to agent owner
    uint256 public constant STAKER_SHARE   = 30; // 30% to stakers
    uint256 public constant PRECISION      = 1e18;

    // ── Contracts ──────────────────────────────────────────────────────────────
    IERC20            public immutable ghostToken;
    ReputationEngine  public immutable reputationEngine;

    // ── State ──────────────────────────────────────────────────────────────────
    mapping(uint256 => VaultInfo)                        private _vaults;   // agentId => vault
    mapping(uint256 => mapping(address => StakerPosition)) private _positions; // agentId => staker => pos
    uint256[] private _allAgents;
    mapping(uint256 => bool) private _vaultCreated;

    // ── Events ─────────────────────────────────────────────────────────────────
    event VaultCreated(uint256 indexed agentId);
    event Deposited(uint256 indexed agentId, address indexed staker, uint256 amount, uint256 shares);
    event Withdrawn(uint256 indexed agentId, address indexed staker, uint256 amount, uint256 shares);
    event RewardsDistributed(uint256 indexed agentId, uint256 ownerAmount, uint256 stakerAmount);
    event RewardsClaimed(uint256 indexed agentId, address indexed staker, uint256 amount);

    constructor(address _ghostToken, address _reputationEngine) Ownable(msg.sender) {
        ghostToken       = IERC20(_ghostToken);
        reputationEngine = ReputationEngine(_reputationEngine);
    }

    // ── Vault Lifecycle ────────────────────────────────────────────────────────

    function _ensureVault(uint256 agentId) internal {
        if (!_vaultCreated[agentId]) {
            _vaultCreated[agentId] = true;
            _allAgents.push(agentId);
            _vaults[agentId].exists = true;
            emit VaultCreated(agentId);
        }
    }

    // ── Staking ────────────────────────────────────────────────────────────────

    /// @notice Stake GHOST onto a specific agent's vault
    function deposit(uint256 agentId, uint256 amount) external nonReentrant {
        require(amount > 0, "StakeVault: zero amount");
        _ensureVault(agentId);

        VaultInfo storage vault = _vaults[agentId];
        StakerPosition storage pos = _positions[agentId][msg.sender];

        // Settle pending rewards before changing shares
        _settlePending(vault, pos);

        ghostToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 shares;
        if (vault.totalShares == 0 || vault.totalDeposited == 0) {
            shares = amount; // first depositor: 1:1
        } else {
            shares = amount * vault.totalShares / vault.totalDeposited;
        }

        pos.shares        += shares;
        pos.rewardDebt     = vault.rewardPerShare;
        vault.totalShares     += shares;
        vault.totalDeposited  += amount;

        emit Deposited(agentId, msg.sender, amount, shares);
    }

    /// @notice Withdraw staked GHOST by burning shares
    function withdraw(uint256 agentId, uint256 shares) external nonReentrant {
        VaultInfo storage vault    = _vaults[agentId];
        StakerPosition storage pos = _positions[agentId][msg.sender];

        require(pos.shares >= shares, "StakeVault: insufficient shares");
        require(vault.totalShares > 0, "StakeVault: empty vault");

        _settlePending(vault, pos);

        uint256 amount = shares * vault.totalDeposited / vault.totalShares;

        pos.shares           -= shares;
        pos.rewardDebt        = vault.rewardPerShare;
        vault.totalShares    -= shares;
        vault.totalDeposited = vault.totalDeposited >= amount ? vault.totalDeposited - amount : 0;

        ghostToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(agentId, msg.sender, amount, shares);
    }

    /// @notice Claim accrued GHOST rewards
    function claimRewards(uint256 agentId) external nonReentrant {
        VaultInfo storage vault    = _vaults[agentId];
        StakerPosition storage pos = _positions[agentId][msg.sender];

        _settlePending(vault, pos);

        uint256 pending = pos.pendingRewards;
        require(pending > 0, "StakeVault: nothing to claim");

        pos.pendingRewards = 0;
        ghostToken.safeTransfer(msg.sender, pending);

        emit RewardsClaimed(agentId, msg.sender, pending);
    }

    // ── Profit Distribution ────────────────────────────────────────────────────

    /// @notice Called by MatchEngine / external keeper with agent trade profit
    /// @param agentId       NFT id of the earning agent
    /// @param profit        GHOST profit amount (must be pre-transferred to this contract)
    /// @param agentOwner    address of the NFT owner receiving 70%
    function distributeProfit(
        uint256 agentId,
        uint256 profit,
        address agentOwner
    ) external onlyOwner {
        require(profit > 0, "StakeVault: zero profit");
        _ensureVault(agentId);

        VaultInfo storage vault = _vaults[agentId];

        uint256 ownerAmount  = profit * OWNER_SHARE  / 100;
        uint256 stakerAmount = profit * STAKER_SHARE / 100;

        // Pay owner directly
        ghostToken.safeTransfer(agentOwner, ownerAmount);

        // Distribute to stakers via rewardPerShare accumulator
        if (vault.totalShares > 0 && stakerAmount > 0) {
            vault.rewardPerShare += stakerAmount * PRECISION / vault.totalShares;
        } else if (stakerAmount > 0) {
            // No stakers yet — send remainder to owner
            ghostToken.safeTransfer(agentOwner, stakerAmount);
        }

        unchecked { vault.totalRewards += profit; }

        emit RewardsDistributed(agentId, ownerAmount, stakerAmount);
    }

    // ── Views ──────────────────────────────────────────────────────────────────
    function getVault(uint256 agentId) external view returns (VaultInfo memory) {
        return _vaults[agentId];
    }

    function getPosition(uint256 agentId, address staker) external view returns (StakerPosition memory) {
        return _positions[agentId][staker];
    }

    function pendingRewards(uint256 agentId, address staker) external view returns (uint256) {
        VaultInfo storage vault    = _vaults[agentId];
        StakerPosition storage pos = _positions[agentId][staker];
        uint256 pending = pos.pendingRewards;
        if (pos.shares > 0) {
            uint256 accDelta = vault.rewardPerShare - pos.rewardDebt;
            pending += pos.shares * accDelta / PRECISION;
        }
        return pending;
    }

    function getAPY(uint256 agentId) external view returns (uint256) {
        return reputationEngine.apyMultiplier(agentId);
    }

    function allVaultAgents() external view returns (uint256[] memory) {
        return _allAgents;
    }

    // ── Internal ───────────────────────────────────────────────────────────────
    function _settlePending(VaultInfo storage vault, StakerPosition storage pos) internal {
        if (pos.shares > 0) {
            uint256 accDelta = vault.rewardPerShare - pos.rewardDebt;
            pos.pendingRewards += pos.shares * accDelta / PRECISION;
        }
        pos.rewardDebt = vault.rewardPerShare;
    }
}
