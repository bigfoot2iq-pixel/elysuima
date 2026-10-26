// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ElyziumaToken} from "../src/ElyziumaToken.sol";
import {ElyziumaClaim} from "../src/ElyziumaClaim.sol";

/// @notice Deploys ElyziumaToken and ElyziumaClaim, then funds both claim pools.
/// @dev Required env:
///      DEPLOYER_PRIVATE_KEY
///      NFT_ADDRESS (the ElyziumaNFT collection on the same chain)
///
///      Optional:
///      OWNER_ALLOCATION_RECIPIENT   default deployer
///      CLAIM_OWNER                  default deployer
///      FEE_RECIPIENT                default deployer
///      COMMUNITY_CLAIM_FEE          default 0
contract Deploy is Script {
    // Fixed tokenomics: 50M total = 22.22M NFT pool + 22.22M community pool +
    // 5.56M owner allocation. These must match ElyziumaClaim's pool constants.
    uint256 internal constant TOTAL_SUPPLY = 50_000_000e18;
    uint256 internal constant NFT_ALLOCATION = 22_220_000e18;
    uint256 internal constant COMMUNITY_ALLOCATION = 22_220_000e18;
    uint256 internal constant OWNER_ALLOCATION = 5_560_000e18;

    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        address nftAddress = vm.envAddress("NFT_ADDRESS");
        require(nftAddress.code.length > 0, "NFT_ADDRESS has no code");

        address ownerRecipient = vm.envOr("OWNER_ALLOCATION_RECIPIENT", deployer);
        address claimOwner = vm.envOr("CLAIM_OWNER", deployer);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);
        uint256 communityClaimFee = vm.envOr("COMMUNITY_CLAIM_FEE", uint256(0));

        require(
            NFT_ALLOCATION + COMMUNITY_ALLOCATION + OWNER_ALLOCATION == TOTAL_SUPPLY,
            "tokenomics do not sum to TOTAL_SUPPLY"
        );
        require(ownerRecipient != address(0), "owner recipient is zero");
        require(claimOwner != address(0), "claim owner is zero");
        require(feeRecipient != address(0), "fee recipient is zero");

        vm.startBroadcast(deployerPk);

        ElyziumaToken token = new ElyziumaToken(TOTAL_SUPPLY, deployer);
        ElyziumaClaim claim = new ElyziumaClaim(
            IERC20(address(token)), IERC721(nftAddress), communityClaimFee, feeRecipient, claimOwner
        );

        require(ownerRecipient != address(claim), "owner recipient cannot be the claim contract");

        require(
            token.transfer(address(claim), NFT_ALLOCATION + COMMUNITY_ALLOCATION),
            "claim pool funding failed"
        );
        require(
            token.transfer(ownerRecipient, OWNER_ALLOCATION), "owner allocation transfer failed"
        );

        vm.stopBroadcast();

        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("NFT collection:", nftAddress);
        console2.log("Claim owner:", claimOwner);
        console2.log("Fee recipient:", feeRecipient);
        console2.log("ElyziumaToken:", address(token));
        console2.log("ElyziumaClaim:", address(claim));
        console2.log("Token supply:", TOTAL_SUPPLY);
        console2.log("NFT claim allocation:", NFT_ALLOCATION);
        console2.log("Community claim allocation:", COMMUNITY_ALLOCATION);
        console2.log("Owner allocation:", OWNER_ALLOCATION);
        console2.log("Community claim fee (wei):", communityClaimFee);
        console2.log("NFT claims: free");
        console2.log("Claim token balance:", token.balanceOf(address(claim)));
        console2.log("Owner allocation recipient:", ownerRecipient);
    }
}
