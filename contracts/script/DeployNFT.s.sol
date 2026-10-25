// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ElyziumaNFT} from "../src/ElyziumaNFT.sol";

/// @notice Deploys the Elyziuma NFT collection.
/// @dev Required env:
///      DEPLOYER_PRIVATE_KEY
///      Optional: NFT_BASE_URI, NFT_OWNER, NFT_PUBLIC_PRICE.
///      MAX_SUPPLY is a contract constant; maxPerWallet is owner-controlled and
///      starts at 1.
contract DeployNFT is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);
        address owner = vm.envOr("NFT_OWNER", deployer);
        string memory baseURI = vm.envOr("NFT_BASE_URI", string("ipfs://bafycollection/"));

        vm.startBroadcast(deployerPk);

        ElyziumaNFT nft = new ElyziumaNFT(owner, baseURI);

        uint256 publicPrice = vm.envOr("NFT_PUBLIC_PRICE", uint256(0));

        nft.setPublicPrice(publicPrice);

        vm.stopBroadcast();

        console2.log("Deployer:", deployer);
        console2.log("Owner:", owner);
        console2.log("ElyziumaNFT:", address(nft));
        console2.log("Name:", nft.name());
        console2.log("Symbol:", nft.symbol());
        console2.log("Max supply:", nft.MAX_SUPPLY());
        console2.log("Max per wallet:", nft.maxPerWallet());
        console2.log("Public price:", publicPrice);
    }
}
