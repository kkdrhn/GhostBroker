// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title GhostToken — Deflationary ERC-20 powering the Ghost Broker economy
/// @notice Fixed supply. Authorised contracts (MatchEngine, StakeVault) call burnFee().
contract GhostToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether; // 1 billion GHOST

    uint256 public totalBurned;

    event FeeBurned(address indexed burner, uint256 amount, uint256 totalBurned);

    constructor(address treasury) ERC20("Ghost Token", "GHOST") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _mint(treasury, INITIAL_SUPPLY);
    }

    /// @notice Called by MatchEngine on each matched trade — micro-fee deflationary burn
    function burnFee(uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(msg.sender, amount);
        unchecked {
            totalBurned += amount;
        }
        emit FeeBurned(msg.sender, amount, totalBurned);
    }

    /// @notice Circulating supply excluding burned tokens
    function circulatingSupply() external view returns (uint256) {
        return INITIAL_SUPPLY - totalBurned;
    }
}
