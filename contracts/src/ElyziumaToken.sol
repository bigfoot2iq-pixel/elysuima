// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

/// @title Elyziuma
/// @notice Fixed-supply ERC-20 for the Elyziuma testnet daily claim.
/// @dev The entire supply is minted once at deployment. There is no post-deploy mint function.
contract ElyziumaToken is ERC20Capped {
    /// @param cap_ Total supply, in token base units (18 decimals).
    /// @param recipient Address that receives the entire initial supply.
    constructor(uint256 cap_, address recipient) ERC20("Elyziuma", "ELYZ") ERC20Capped(cap_) {
        if (recipient == address(0)) revert ERC20InvalidReceiver(address(0));
        _mint(recipient, cap_);
    }
}
