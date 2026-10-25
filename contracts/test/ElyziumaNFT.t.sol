// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ElyziumaNFT} from "../src/ElyziumaNFT.sol";

contract ElyziumaNFTTest is Test {
    ElyziumaNFT internal nft;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    uint256 internal constant UNIT_PRICE = 0.05 ether;

    function setUp() public {
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
        nft = new ElyziumaNFT(owner, "ipfs://bafycollection/");
    }

    function _openPublic(uint256 price) internal {
        vm.prank(owner);
        nft.setPublicPrice(price);
        vm.prank(owner);
        nft.setPublicMintOpen(true);
    }

    // ---- Deployment ---------------------------------------------------------

    function testCollectionMetadata() public view {
        assertEq(nft.name(), "Elyziuma");
        assertEq(nft.symbol(), "ELYZ");
        assertEq(nft.owner(), owner);
        assertEq(nft.MAX_SUPPLY(), 2222);
        assertEq(nft.maxPerWallet(), 1);
        assertEq(nft.maxSupply(), 2222);
        assertEq(nft.totalMinted(), 0);
        assertEq(nft.totalSupply(), 0);
    }

    function testTokenIdsStartAtOne() public {
        _openPublic(0);

        vm.prank(alice);
        nft.publicMint(1);

        assertEq(nft.ownerOf(1), alice);
        assertEq(nft.balanceOf(alice), 1);
    }

    function testConstructorRejectsZeroOwner() public {
        vm.expectPartialRevert(Ownable.OwnableInvalidOwner.selector);
        new ElyziumaNFT(address(0), "ipfs://bafycollection/");
    }

    function testOnlyOwnerCanSetPublicMintOpen() public {
        vm.prank(alice);
        vm.expectPartialRevert(Ownable.OwnableUnauthorizedAccount.selector);
        nft.setPublicMintOpen(true);
    }

    function testOwnerCanSetMaxPerWallet() public {
        vm.prank(owner);
        nft.setMaxPerWallet(3);

        assertEq(nft.maxPerWallet(), 3);
    }

    function testOnlyOwnerCanSetMaxPerWallet() public {
        vm.prank(alice);
        vm.expectPartialRevert(Ownable.OwnableUnauthorizedAccount.selector);
        nft.setMaxPerWallet(3);
    }

    function testSetMaxPerWalletZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaNFT.InvalidMaxPerWallet.selector);
        nft.setMaxPerWallet(0);
    }

    // ---- Public mint --------------------------------------------------------

    function testPublicMint() public {
        _openPublic(UNIT_PRICE);

        vm.prank(alice);
        nft.publicMint{value: UNIT_PRICE}(1);

        assertEq(nft.balanceOf(alice), 1);
        assertEq(nft.minted(alice), 1);
        assertEq(nft.totalMinted(), 1);
        assertEq(nft.remainingForWallet(alice), 0);
    }

    function testPublicMintEmitsEvent() public {
        _openPublic(UNIT_PRICE);

        vm.expectEmit(true, true, true, true);
        emit ElyziumaNFT.PublicMinted(alice, 1);

        vm.prank(alice);
        nft.publicMint{value: UNIT_PRICE}(1);
    }

    function testPublicMintClosedReverts() public {
        vm.prank(alice);
        vm.expectRevert(ElyziumaNFT.PublicClosed.selector);
        nft.publicMint{value: UNIT_PRICE}(1);
    }

    function testPublicMintZeroQuantityReverts() public {
        _openPublic(UNIT_PRICE);

        vm.prank(alice);
        vm.expectRevert(ElyziumaNFT.ZeroQuantity.selector);
        nft.publicMint{value: 0}(0);
    }

    function testPublicMintWrongPaymentReverts() public {
        _openPublic(UNIT_PRICE);

        vm.prank(alice);
        vm.expectRevert(ElyziumaNFT.WrongPayment.selector);
        nft.publicMint{value: UNIT_PRICE * 2}(1);
    }

    function testPublicMintExceedsWalletCapReverts() public {
        _openPublic(UNIT_PRICE);

        vm.prank(alice);
        nft.publicMint{value: UNIT_PRICE}(1);

        vm.prank(alice);
        vm.expectRevert(ElyziumaNFT.ExceedsWalletCap.selector);
        nft.publicMint{value: UNIT_PRICE}(1);
    }

    function testPublicMintCapIsPerWallet() public {
        _openPublic(UNIT_PRICE);

        vm.prank(alice);
        nft.publicMint{value: UNIT_PRICE}(1);

        vm.prank(bob);
        nft.publicMint{value: UNIT_PRICE}(1);

        assertEq(nft.totalMinted(), 2);
        assertEq(nft.remainingForWallet(bob), 0);
    }

    function testPublicMintUsesUpdatedCap() public {
        _openPublic(UNIT_PRICE);

        vm.prank(owner);
        nft.setMaxPerWallet(3);

        vm.prank(alice);
        nft.publicMint{value: UNIT_PRICE * 3}(3);

        assertEq(nft.balanceOf(alice), 3);
        assertEq(nft.remainingForWallet(alice), 0);

        vm.prank(alice);
        vm.expectRevert(ElyziumaNFT.ExceedsWalletCap.selector);
        nft.publicMint{value: UNIT_PRICE}(1);
    }

    function testLoweringCapBlocksFurtherMints() public {
        _openPublic(UNIT_PRICE);

        vm.prank(owner);
        nft.setMaxPerWallet(3);

        vm.prank(alice);
        nft.publicMint{value: UNIT_PRICE * 2}(2);

        vm.prank(owner);
        nft.setMaxPerWallet(1);

        vm.prank(alice);
        vm.expectRevert(ElyziumaNFT.ExceedsWalletCap.selector);
        nft.publicMint{value: UNIT_PRICE}(1);

        assertEq(nft.balanceOf(alice), 2);
    }

    function testPublicMintExceedsSupplyReverts() public {
        _openPublic(0);

        vm.prank(owner);
        nft.ownerMint(owner, 2222);

        vm.prank(alice);
        vm.expectRevert(ElyziumaNFT.ExceedsSupply.selector);
        nft.publicMint{value: 0}(1);
    }

    // ---- Owner mint ---------------------------------------------------------

    function testOwnerMintIsFreeAndExemptFromCaps() public {
        vm.prank(owner);
        nft.ownerMint(carol, 50);

        assertEq(nft.balanceOf(carol), 50);
        assertEq(nft.minted(carol), 0);
        assertEq(nft.totalMinted(), 50);
    }

    function testOwnerMintZeroQuantityReverts() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaNFT.ZeroQuantity.selector);
        nft.ownerMint(carol, 0);
    }

    function testOwnerMintToZeroAddressReverts() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaNFT.ZeroAddress.selector);
        nft.ownerMint(address(0), 1);
    }

    function testOwnerMintExceedsSupplyReverts() public {
        vm.prank(owner);
        nft.ownerMint(owner, 2222);

        vm.prank(owner);
        vm.expectRevert(ElyziumaNFT.ExceedsSupply.selector);
        nft.ownerMint(owner, 1);
    }

    function testOnlyOwnerCanOwnerMint() public {
        vm.prank(alice);
        vm.expectPartialRevert(Ownable.OwnableUnauthorizedAccount.selector);
        nft.ownerMint(alice, 1);
    }

    // ---- Metadata -----------------------------------------------------------

    function testTokenURIAppendsJson() public {
        _openPublic(0);

        vm.prank(alice);
        nft.publicMint(1);

        assertEq(nft.tokenURI(1), "ipfs://bafycollection/1.json");
    }

    function testSetBaseURI() public {
        _openPublic(0);

        vm.prank(alice);
        nft.publicMint(1);

        vm.prank(owner);
        nft.setBaseURI("ipfs://bafynew/");

        assertEq(nft.tokenURI(1), "ipfs://bafynew/1.json");
    }

    function testTokenURIForUnknownTokenReverts() public {
        vm.expectRevert();
        nft.tokenURI(1);
    }

    // ---- Supply helpers -----------------------------------------------------

    function testGetMintStats() public {
        _openPublic(UNIT_PRICE);

        vm.prank(alice);
        nft.publicMint{value: UNIT_PRICE}(1);

        (uint256 minterNumMinted, uint256 currentTotalSupply, uint256 maxSupply) =
            nft.getMintStats(alice);

        assertEq(minterNumMinted, 1);
        assertEq(currentTotalSupply, 1);
        assertEq(maxSupply, 2222);
    }

    // ---- Withdraw -----------------------------------------------------------

    function testWithdraw() public {
        _openPublic(UNIT_PRICE);

        vm.prank(alice);
        nft.publicMint{value: UNIT_PRICE}(1);

        uint256 balance = address(nft).balance;
        assertEq(balance, UNIT_PRICE);

        uint256 ownerBefore = owner.balance;

        vm.prank(owner);
        nft.withdraw(payable(owner));

        assertEq(address(nft).balance, 0);
        assertEq(owner.balance, ownerBefore + balance);
    }

    function testWithdrawToZeroAddressReverts() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaNFT.ZeroAddress.selector);
        nft.withdraw(payable(address(0)));
    }

    function testOnlyOwnerCanWithdraw() public {
        vm.prank(alice);
        vm.expectPartialRevert(Ownable.OwnableUnauthorizedAccount.selector);
        nft.withdraw(payable(alice));
    }
}
