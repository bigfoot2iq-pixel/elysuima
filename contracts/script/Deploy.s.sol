// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ElyziumaToken} from "../src/ElyziumaToken.sol";
import {DailyClaim} from "../src/DailyClaim.sol";

/// @notice Deploys ElyziumaToken and DailyClaim, then funds the faucet.
/// @dev Required env:
///      DEPLOYER_PRIVATE_KEY
///      CLAIM_SIGNER_ADDRESS (defaults to the deployer)
///      Optional: TOKEN_SUPPLY, FAUCET_ALLOCATION, DAILY_AMOUNT
contract Deploy is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);
        address signer = vm.envOr("CLAIM_SIGNER_ADDRESS", deployer);

        // Shaniu-style split: 21M supply, 90% claim pool, 10% retained by the deployer.
        uint256 supply = vm.envOr("TOKEN_SUPPLY", uint256(21_000_000e18));
        uint256 faucetAllocation = vm.envOr("FAUCET_ALLOCATION", uint256(18_900_000e18));
        uint256 dailyAmount = vm.envOr("DAILY_AMOUNT", uint256(100e18));

        require(faucetAllocation <= supply, "faucet allocation exceeds supply");
        require(dailyAmount > 0, "daily amount must be positive");

        vm.startBroadcast(deployerPk);

        ElyziumaToken token = new ElyziumaToken(supply, deployer);
        DailyClaim claim = new DailyClaim(IERC20(address(token)), dailyAmount, signer);
        token.transfer(address(claim), faucetAllocation);

        vm.stopBroadcast();

        console2.log("Deployer:", deployer);
        console2.log("Claim signer:", signer);
        console2.log("ElyziumaToken:", address(token));
        console2.log("DailyClaim:", address(claim));
        console2.log("Token supply:", supply);
        console2.log("Faucet allocation:", faucetAllocation);
        console2.log("Daily amount:", dailyAmount);
    }
}
