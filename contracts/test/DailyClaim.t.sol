// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ElyziumaToken} from "../src/ElyziumaToken.sol";
import {DailyClaim} from "../src/DailyClaim.sol";

contract DailyClaimTest is Test {
    ElyziumaToken internal token;
    DailyClaim internal claim;

    uint256 internal constant SIGNER_PK = 0xA11CE;
    uint256 internal constant OTHER_PK = 0xB0B;
    uint256 internal constant SUPPLY = 21_000_000e18;
    uint256 internal constant FAUCET_FUND = 18_900_000e18;
    uint256 internal constant DAILY = 100e18;

    address internal signer;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        signer = vm.addr(SIGNER_PK);
        token = new ElyziumaToken(SUPPLY, address(this));
        claim = new DailyClaim(IERC20(address(token)), DAILY, signer);
        token.transfer(address(claim), FAUCET_FUND);
    }

    function _sign(address wallet, uint256 amount, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(SIGNER_PK, claim.hashClaim(wallet, amount, nonce, deadline));
        return abi.encodePacked(r, s, v);
    }

    function _signWith(uint256 pk, address wallet, uint256 amount, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(pk, claim.hashClaim(wallet, amount, nonce, deadline));
        return abi.encodePacked(r, s, v);
    }

    function testInitialSupplyAndFaucetFunding() public view {
        assertEq(token.name(), "Elyziuma");
        assertEq(token.symbol(), "ELYZ");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.cap(), SUPPLY);
        assertEq(token.balanceOf(address(claim)), FAUCET_FUND);
    }

    function testClaim() public {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, DAILY, 0, deadline);

        vm.prank(alice);
        claim.claim(DAILY, 0, deadline, sig);

        assertEq(token.balanceOf(alice), DAILY);
        assertEq(claim.lastClaim(alice), block.timestamp);
        assertEq(claim.nonces(alice), 1);
        assertEq(claim.totalClaimed(), DAILY);
        assertEq(claim.totalClaims(), 1);
        assertEq(claim.uniqueClaimers(), 1);
        assertEq(token.balanceOf(address(claim)), FAUCET_FUND - DAILY);
    }

    function testClaimTwiceReverts() public {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory firstSig = _sign(alice, DAILY, 0, deadline);
        vm.prank(alice);
        claim.claim(DAILY, 0, deadline, firstSig);

        uint256 nextClaimAt = block.timestamp + 24 hours;
        vm.warp(block.timestamp + 1 hours);

        uint256 secondDeadline = block.timestamp + 10 minutes;
        bytes memory secondSig = _sign(alice, DAILY, 1, secondDeadline);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DailyClaim.ClaimTooSoon.selector, nextClaimAt));
        claim.claim(DAILY, 1, secondDeadline, secondSig);
    }

    function testClaimAfterCooldown() public {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory firstSig = _sign(alice, DAILY, 0, deadline);
        vm.prank(alice);
        claim.claim(DAILY, 0, deadline, firstSig);

        vm.warp(block.timestamp + 24 hours + 1);

        uint256 secondDeadline = block.timestamp + 10 minutes;
        bytes memory secondSig = _sign(alice, DAILY, 1, secondDeadline);
        vm.prank(alice);
        claim.claim(DAILY, 1, secondDeadline, secondSig);

        assertEq(token.balanceOf(alice), DAILY * 2);
        assertEq(claim.nonces(alice), 2);
        assertEq(claim.totalClaims(), 2);
        assertEq(claim.uniqueClaimers(), 1);
    }

    function testExpiredSignatureReverts() public {
        uint256 deadline = block.timestamp - 1;
        bytes memory sig = _sign(alice, DAILY, 0, deadline);
        vm.prank(alice);
        vm.expectRevert(DailyClaim.SignatureExpired.selector);
        claim.claim(DAILY, 0, deadline, sig);
    }

    function testInvalidNonceReverts() public {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, DAILY, 1, deadline);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DailyClaim.InvalidNonce.selector, 0));
        claim.claim(DAILY, 1, deadline, sig);
    }

    function testWrongAmountReverts() public {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, 50e18, 0, deadline);
        vm.prank(alice);
        vm.expectRevert(DailyClaim.InvalidAmount.selector);
        claim.claim(50e18, 0, deadline, sig);
    }

    function testWrongSignerReverts() public {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _signWith(OTHER_PK, alice, DAILY, 0, deadline);

        vm.prank(alice);
        vm.expectRevert(DailyClaim.InvalidSignature.selector);
        claim.claim(DAILY, 0, deadline, sig);
    }

    function testSignatureBoundToWallet() public {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, DAILY, 0, deadline);

        vm.prank(bob);
        vm.expectRevert(DailyClaim.InvalidSignature.selector);
        claim.claim(DAILY, 0, deadline, sig);
    }

    function testReplayReverts() public {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, DAILY, 0, deadline);

        vm.prank(alice);
        claim.claim(DAILY, 0, deadline, sig);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DailyClaim.InvalidNonce.selector, 1));
        claim.claim(DAILY, 0, deadline, sig);
    }

    function testPauseReverts() public {
        claim.pause();
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, DAILY, 0, deadline);

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        claim.claim(DAILY, 0, deadline, sig);
    }

    function testWithdraw() public {
        claim.withdraw(alice, 1_000e18);
        assertEq(token.balanceOf(alice), 1_000e18);
        assertEq(token.balanceOf(address(claim)), FAUCET_FUND - 1_000e18);
    }

    function testSetDailyAmount() public {
        claim.setDailyAmount(200e18);
        assertEq(claim.dailyAmount(), 200e18);

        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, 200e18, 0, deadline);
        vm.prank(alice);
        claim.claim(200e18, 0, deadline, sig);

        assertEq(token.balanceOf(alice), 200e18);
    }

    function testOldAmountRevertsAfterUpdate() public {
        claim.setDailyAmount(200e18);
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, DAILY, 0, deadline);

        vm.prank(alice);
        vm.expectRevert(DailyClaim.InvalidAmount.selector);
        claim.claim(DAILY, 0, deadline, sig);
    }

    function testSetSigner() public {
        uint256 newPk = 0xCAFE;
        address newSigner = vm.addr(newPk);
        claim.setSigner(newSigner);
        assertEq(claim.signer(), newSigner);

        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory oldSig = _sign(alice, DAILY, 0, deadline);

        vm.prank(alice);
        vm.expectRevert(DailyClaim.InvalidSignature.selector);
        claim.claim(DAILY, 0, deadline, oldSig);

        bytes memory newSig = _signWith(newPk, alice, DAILY, 0, deadline);
        vm.prank(alice);
        claim.claim(DAILY, 0, deadline, newSig);
        assertEq(token.balanceOf(alice), DAILY);
    }

    function testFaucetEmptyReverts() public {
        claim.withdraw(address(this), FAUCET_FUND);
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, DAILY, 0, deadline);

        vm.prank(alice);
        vm.expectRevert(DailyClaim.FaucetEmpty.selector);
        claim.claim(DAILY, 0, deadline, sig);
    }

    function testFinalClaimSweepsRemainingPool() public {
        uint256 remaining = 40e18;
        claim.withdraw(address(this), FAUCET_FUND - remaining);

        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory sig = _sign(alice, DAILY, 0, deadline);

        vm.prank(alice);
        claim.claim(DAILY, 0, deadline, sig);

        assertEq(token.balanceOf(alice), remaining);
        assertEq(token.balanceOf(address(claim)), 0);
        assertEq(claim.totalClaimed(), remaining);
    }

    function testUniqueClaimers() public {
        uint256 deadline = block.timestamp + 10 minutes;
        bytes memory aliceSig = _sign(alice, DAILY, 0, deadline);
        bytes memory bobSig = _sign(bob, DAILY, 0, deadline);

        vm.prank(alice);
        claim.claim(DAILY, 0, deadline, aliceSig);

        vm.prank(bob);
        claim.claim(DAILY, 0, deadline, bobSig);

        assertEq(claim.uniqueClaimers(), 2);
        assertEq(claim.totalClaims(), 2);
        assertEq(claim.totalClaimed(), DAILY * 2);
    }

    function testOnlyOwnerCanSetAmount() public {
        vm.prank(alice);
        vm.expectRevert();
        claim.setDailyAmount(1e18);
    }

    function testCannotSetZeroAmount() public {
        vm.expectRevert(DailyClaim.InvalidAmount.selector);
        claim.setDailyAmount(0);
    }
}
