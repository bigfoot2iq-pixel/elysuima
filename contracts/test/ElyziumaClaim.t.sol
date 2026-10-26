// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ElyziumaToken} from "../src/ElyziumaToken.sol";
import {ElyziumaNFT} from "../src/ElyziumaNFT.sol";
import {ElyziumaClaim} from "../src/ElyziumaClaim.sol";

contract ElyziumaClaimTest is Test {
    ElyziumaToken internal token;
    ElyziumaNFT internal nft;
    ElyziumaClaim internal claim;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    uint256 internal constant SUPPLY = 50_000_000e18;
    uint256 internal constant NFT_POOL = 22_220_000e18;
    uint256 internal constant COMMUNITY_POOL = 22_220_000e18;
    uint256 internal constant OWNER_ALLOCATION = 5_560_000e18;
    uint256 internal constant NFT_REWARD = 10_000e18;
    uint256 internal constant COMMUNITY_REWARD = 1_000e18;
    uint256 internal constant COMMUNITY_FEE = 0.005 ether;

    function setUp() public {
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);

        token = new ElyziumaToken(SUPPLY, address(this));
        nft = new ElyziumaNFT(owner, "ipfs://bafycollection/");
        claim = new ElyziumaClaim(
            IERC20(address(token)), IERC721(address(nft)), COMMUNITY_FEE, owner, owner
        );

        assertTrue(token.transfer(address(claim), NFT_POOL + COMMUNITY_POOL));
        assertTrue(token.transfer(owner, OWNER_ALLOCATION));

        vm.prank(owner);
        nft.ownerMint(alice, 2); // ids 1, 2
        vm.prank(owner);
        nft.ownerMint(bob, 1); // id 3
    }

    // ---- Helpers ------------------------------------------------------------

    function _ids(uint256 a) internal pure returns (uint256[] memory ids) {
        ids = new uint256[](1);
        ids[0] = a;
    }

    function _ids2(uint256 a, uint256 b) internal pure returns (uint256[] memory ids) {
        ids = new uint256[](2);
        ids[0] = a;
        ids[1] = b;
    }

    function _range(uint256 start, uint256 count) internal pure returns (uint256[] memory ids) {
        ids = new uint256[](count);
        for (uint256 i = 0; i < count; ++i) {
            ids[i] = start + i;
        }
    }

    // ---- Initial state ------------------------------------------------------

    function testAllocationsSumToSupply() public pure {
        assertEq(NFT_POOL + COMMUNITY_POOL + OWNER_ALLOCATION, SUPPLY);
    }

    function testInitialState() public view {
        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.cap(), SUPPLY);
        assertEq(token.balanceOf(address(claim)), NFT_POOL + COMMUNITY_POOL);
        assertEq(token.balanceOf(owner), OWNER_ALLOCATION);
        assertEq(address(claim.token()), address(token));
        assertEq(address(claim.nft()), address(nft));
        assertEq(claim.NFT_REWARD(), NFT_REWARD);
        assertEq(claim.COMMUNITY_REWARD(), COMMUNITY_REWARD);
        assertEq(claim.NFT_POOL(), NFT_POOL);
        assertEq(claim.COMMUNITY_POOL(), COMMUNITY_POOL);
        assertEq(claim.MAX_BATCH(), 50);
        assertEq(claim.communityClaimFee(), COMMUNITY_FEE);
        assertEq(claim.feeRecipient(), owner);
        assertEq(claim.owner(), owner);
        assertEq(claim.nftPoolRemaining(), NFT_POOL);
        assertEq(claim.communityPoolRemaining(), COMMUNITY_POOL);
        assertEq(claim.totalClaimed(), 0);
        assertEq(claim.totalClaims(), 0);
        assertFalse(claim.paused());
    }

    function testConstructorRejectsZeroAddresses() public {
        vm.expectRevert(ElyziumaClaim.ZeroAddress.selector);
        new ElyziumaClaim(IERC20(address(0)), IERC721(address(nft)), COMMUNITY_FEE, owner, owner);

        vm.expectRevert(ElyziumaClaim.ZeroAddress.selector);
        new ElyziumaClaim(IERC20(address(token)), IERC721(address(0)), COMMUNITY_FEE, owner, owner);

        vm.expectRevert(ElyziumaClaim.ZeroAddress.selector);
        new ElyziumaClaim(
            IERC20(address(token)), IERC721(address(nft)), COMMUNITY_FEE, address(0), owner
        );
    }

    // ---- NFT claims ---------------------------------------------------------

    function testNftClaimSingle() public {
        uint256[] memory ids = _ids(1);

        vm.expectEmit(true, true, true, true);
        emit ElyziumaClaim.NftClaimed(alice, 1, NFT_REWARD);

        vm.prank(alice);
        claim.claimNft(ids);

        assertEq(token.balanceOf(alice), NFT_REWARD);
        assertTrue(claim.nftClaimed(1));
        assertEq(claim.nftClaimedTotal(), NFT_REWARD);
        assertEq(claim.nftClaimCount(), 1);
        assertEq(claim.accruedFees(), 0);
        assertEq(claim.nftPoolRemaining(), NFT_POOL - NFT_REWARD);
        assertEq(claim.communityPoolRemaining(), COMMUNITY_POOL);
        assertEq(token.balanceOf(address(claim)), NFT_POOL + COMMUNITY_POOL - NFT_REWARD);
    }

    function testNftClaimBatch() public {
        uint256[] memory ids = _ids2(1, 2);

        vm.prank(alice);
        claim.claimNft(ids);

        assertEq(token.balanceOf(alice), NFT_REWARD * 2);
        assertTrue(claim.nftClaimed(1));
        assertTrue(claim.nftClaimed(2));
        assertEq(claim.nftClaimedTotal(), NFT_REWARD * 2);
        assertEq(claim.nftClaimCount(), 1);
        assertEq(claim.accruedFees(), 0);
    }

    function testNftClaimRequiresOwnership() public {
        uint256[] memory ids = _ids(1);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ElyziumaClaim.NotNftOwner.selector, 1));
        claim.claimNft(ids);
    }

    function testNftClaimAlreadyClaimedReverts() public {
        uint256[] memory ids = _ids(1);

        vm.prank(alice);
        claim.claimNft(ids);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyziumaClaim.NftAlreadyClaimed.selector, 1));
        claim.claimNft(ids);
    }

    function testNftClaimDuplicateIdsRevertAtomically() public {
        uint256[] memory ids = _ids2(1, 1);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyziumaClaim.NftAlreadyClaimed.selector, 1));
        claim.claimNft(ids);

        assertFalse(claim.nftClaimed(1));
        assertEq(claim.nftClaimedTotal(), 0);
        assertEq(token.balanceOf(alice), 0);
    }

    function testNftClaimZeroQuantityReverts() public {
        uint256[] memory ids = new uint256[](0);

        vm.prank(alice);
        vm.expectRevert(ElyziumaClaim.ZeroQuantity.selector);
        claim.claimNft(ids);
    }

    function testNftClaimBatchTooLargeReverts() public {
        vm.prank(owner);
        nft.ownerMint(alice, 51);

        uint256[] memory ids = _range(4, 51);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyziumaClaim.BatchTooLarge.selector, 50));
        claim.claimNft(ids);
    }

    function testNftClaimTransferAfterClaimCannotReclaim() public {
        uint256[] memory ids = _ids(1);

        vm.prank(alice);
        claim.claimNft(ids);

        vm.prank(alice);
        nft.transferFrom(alice, bob, 1);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ElyziumaClaim.NftAlreadyClaimed.selector, 1));
        claim.claimNft(ids);
    }

    function testNftClaimTransferBeforeClaimLetsNewOwnerClaim() public {
        vm.prank(alice);
        nft.transferFrom(alice, bob, 2);

        uint256[] memory ids = _ids(2);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ElyziumaClaim.NotNftOwner.selector, 2));
        claim.claimNft(ids);

        vm.prank(bob);
        claim.claimNft(ids);
        assertTrue(claim.nftClaimed(2));
        assertEq(token.balanceOf(bob), NFT_REWARD);
    }

    function testFuzzNftBatch(uint8 count) public {
        count = uint8(bound(count, 1, 50));

        vm.prank(owner);
        nft.ownerMint(alice, count);

        uint256[] memory ids = _range(4, count);

        vm.prank(alice);
        claim.claimNft(ids);

        assertEq(claim.nftClaimedTotal(), uint256(count) * NFT_REWARD);
        assertEq(token.balanceOf(alice), uint256(count) * NFT_REWARD);
    }

    // ---- Community claim ----------------------------------------------------

    function testCommunityClaim() public {
        vm.expectEmit(true, true, true, true);
        emit ElyziumaClaim.CommunityClaimed(alice, COMMUNITY_REWARD, COMMUNITY_FEE);

        vm.prank(alice);
        claim.claimCommunity{value: COMMUNITY_FEE}();

        assertEq(token.balanceOf(alice), COMMUNITY_REWARD);
        assertTrue(claim.communityClaimed(alice));
        assertEq(claim.communityClaimedTotal(), COMMUNITY_REWARD);
        assertEq(claim.communityClaimCount(), 1);
        assertEq(claim.accruedFees(), COMMUNITY_FEE);
        assertEq(claim.communityPoolRemaining(), COMMUNITY_POOL - COMMUNITY_REWARD);
        assertEq(claim.nftPoolRemaining(), NFT_POOL);
    }

    function testCommunityClaimOncePerWallet() public {
        vm.prank(alice);
        claim.claimCommunity{value: COMMUNITY_FEE}();

        vm.prank(alice);
        vm.expectRevert(ElyziumaClaim.CommunityAlreadyClaimed.selector);
        claim.claimCommunity{value: COMMUNITY_FEE}();
    }

    function testCommunityClaimPerWallet() public {
        vm.prank(alice);
        claim.claimCommunity{value: COMMUNITY_FEE}();
        vm.prank(bob);
        claim.claimCommunity{value: COMMUNITY_FEE}();

        assertEq(claim.communityClaimedTotal(), COMMUNITY_REWARD * 2);
        assertEq(claim.communityClaimCount(), 2);
        assertEq(token.balanceOf(alice), COMMUNITY_REWARD);
        assertEq(token.balanceOf(bob), COMMUNITY_REWARD);
    }

    function testCommunityClaimWrongFeeReverts() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ElyziumaClaim.IncorrectFee.selector, COMMUNITY_FEE, COMMUNITY_FEE - 1
            )
        );
        claim.claimCommunity{value: COMMUNITY_FEE - 1}();

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ElyziumaClaim.IncorrectFee.selector, COMMUNITY_FEE, COMMUNITY_FEE + 1
            )
        );
        claim.claimCommunity{value: COMMUNITY_FEE + 1}();
    }

    function testCommunityClaimDoesNotTouchNftPool() public {
        vm.prank(alice);
        claim.claimCommunity{value: COMMUNITY_FEE}();

        assertEq(claim.nftPoolRemaining(), NFT_POOL);
        assertEq(claim.nftClaimedTotal(), 0);
    }

    // ---- Pause --------------------------------------------------------------

    function testPauseBlocksClaims() public {
        vm.prank(owner);
        claim.pause();

        uint256[] memory ids = _ids(1);

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        claim.claimNft(ids);

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        claim.claimCommunity{value: COMMUNITY_FEE}();

        vm.prank(owner);
        claim.unpause();

        vm.prank(alice);
        claim.claimCommunity{value: COMMUNITY_FEE}();
        assertTrue(claim.communityClaimed(alice));
    }

    // ---- Fees / owner -------------------------------------------------------

    function testSetCommunityFee() public {
        vm.expectEmit(false, false, false, true);
        emit ElyziumaClaim.CommunityClaimFeeUpdated(0.01 ether);
        vm.prank(owner);
        claim.setCommunityClaimFee(0.01 ether);

        assertEq(claim.communityClaimFee(), 0.01 ether);
    }

    function testZeroFeeAllowsFreeCommunityClaim() public {
        vm.prank(owner);
        claim.setCommunityClaimFee(0);

        uint256[] memory ids = _ids(1);
        vm.prank(alice);
        claim.claimNft(ids);
        vm.prank(alice);
        claim.claimCommunity();

        assertEq(token.balanceOf(alice), NFT_REWARD + COMMUNITY_REWARD);
        assertEq(claim.accruedFees(), 0);
    }

    function testSetFeeRecipient() public {
        vm.expectEmit(true, false, false, true);
        emit ElyziumaClaim.FeeRecipientUpdated(carol);
        vm.prank(owner);
        claim.setFeeRecipient(carol);

        assertEq(claim.feeRecipient(), carol);
    }

    function testSetFeeRecipientZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaClaim.ZeroAddress.selector);
        claim.setFeeRecipient(address(0));
    }

    function testOnlyOwnerCanConfigure() public {
        vm.startPrank(alice);
        vm.expectPartialRevert(Ownable.OwnableUnauthorizedAccount.selector);
        claim.setCommunityClaimFee(0);

        vm.expectPartialRevert(Ownable.OwnableUnauthorizedAccount.selector);
        claim.setFeeRecipient(alice);

        vm.expectPartialRevert(Ownable.OwnableUnauthorizedAccount.selector);
        claim.pause();

        vm.expectPartialRevert(Ownable.OwnableUnauthorizedAccount.selector);
        claim.withdrawFees();

        vm.expectPartialRevert(Ownable.OwnableUnauthorizedAccount.selector);
        claim.withdrawSurplus(alice, 1);
        vm.stopPrank();
    }

    function testWithdrawFees() public {
        vm.prank(alice);
        claim.claimCommunity{value: COMMUNITY_FEE}();

        uint256 ownerBefore = owner.balance;

        vm.prank(owner);
        claim.withdrawFees();

        assertEq(owner.balance, ownerBefore + COMMUNITY_FEE);
        assertEq(claim.accruedFees(), 0);
        assertEq(address(claim).balance, 0);
    }

    function testWithdrawFeesNoFeesReverts() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaClaim.NoFees.selector);
        claim.withdrawFees();
    }

    // ---- Surplus ------------------------------------------------------------

    function testWithdrawSurplus() public {
        vm.prank(owner);
        assertTrue(token.transfer(address(claim), 1_000e18));

        vm.prank(owner);
        claim.withdrawSurplus(carol, 1_000e18);

        assertEq(token.balanceOf(carol), 1_000e18);
        assertEq(token.balanceOf(address(claim)), NFT_POOL + COMMUNITY_POOL);
    }

    function testWithdrawSurplusCannotTouchClaimPools() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaClaim.NoSurplus.selector);
        claim.withdrawSurplus(owner, 1);
    }

    function testWithdrawSurplusRejectsMoreThanSurplus() public {
        vm.prank(owner);
        assertTrue(token.transfer(address(claim), 1_000e18));

        vm.prank(owner);
        vm.expectRevert(ElyziumaClaim.NoSurplus.selector);
        claim.withdrawSurplus(owner, 1_001e18);
    }

    function testWithdrawSurplusZeroAddressReverts() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaClaim.ZeroAddress.selector);
        claim.withdrawSurplus(address(0), 1);
    }

    function testWithdrawSurplusZeroAmountReverts() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaClaim.ZeroQuantity.selector);
        claim.withdrawSurplus(owner, 0);
    }

    function testWithdrawNativeSurplus() public {
        vm.prank(alice);
        (bool sent,) = address(claim).call{value: 1 ether}("");
        assertTrue(sent);

        uint256 carolBefore = carol.balance;

        vm.prank(owner);
        claim.withdrawNativeSurplus(payable(carol));

        assertEq(carol.balance, carolBefore + 1 ether);
        assertEq(address(claim).balance, 0);
    }

    function testWithdrawNativeSurplusExcludesAccruedFees() public {
        vm.prank(alice);
        claim.claimCommunity{value: COMMUNITY_FEE}();

        vm.prank(alice);
        (bool sent,) = address(claim).call{value: 1 ether}("");
        assertTrue(sent);

        uint256 carolBefore = carol.balance;

        vm.prank(owner);
        claim.withdrawNativeSurplus(payable(carol));

        assertEq(carol.balance, carolBefore + 1 ether);
        assertEq(address(claim).balance, COMMUNITY_FEE);
        assertEq(claim.accruedFees(), COMMUNITY_FEE);
    }

    function testWithdrawNativeSurplusNoSurplusReverts() public {
        vm.prank(owner);
        vm.expectRevert(ElyziumaClaim.NoSurplus.selector);
        claim.withdrawNativeSurplus(payable(carol));
    }
}
