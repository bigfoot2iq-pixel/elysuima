// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Elyziuma Claim
/// @notice Two independent one-time reward pools funded at deployment:
///
///   - NFT holders: {NFT_REWARD} ELYZ per NFT, claimable once per token id.
///   - Community: {COMMUNITY_REWARD} ELYZ per wallet, claimable once per wallet.
///
/// A reward belongs to the token id, not to a wallet. Once an NFT has claimed,
/// the claim is consumed forever, even if the NFT is later transferred. An
/// unclaimed NFT can still be claimed by whoever holds it at claim time. The two
/// pools are independent, so a holder can claim the community reward as well and
/// a community claimant can later claim any unclaimed NFTs they hold.
///
/// NFT claims are free. Community claims charge an owner-set HYPE fee. Fees
/// accrue in the contract and are withdrawn by the owner to {feeRecipient}. The
/// token pools cannot be withdrawn by the owner: {withdrawSurplus} only releases
/// tokens above the outstanding NFT + community liabilities.
///
/// @dev The cross-chain balance threshold used by the website is deliberately
///      not enforced here. It is a community-claim UI gate only, so a direct
///      contract call that holds the required NFT or has not claimed the
///      community reward succeeds.
contract ElyziumaClaim is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---- Rewards and pools --------------------------------------------------
    /// @notice ELYZ paid for every NFT claimed.
    uint256 public constant NFT_REWARD = 10_000e18;

    /// @notice ELYZ paid once per wallet from the community pool.
    uint256 public constant COMMUNITY_REWARD = 1_000e18;

    /// @notice Total ELYZ reserved for NFT holders (2,222 NFTs x 10,000).
    uint256 public constant NFT_POOL = 22_220_000e18;

    /// @notice Total ELYZ reserved for the community (11,110 wallets x 1,000).
    uint256 public constant COMMUNITY_POOL = 11_110_000e18;

    /// @notice Maximum number of NFT ids that can be claimed in one transaction.
    uint256 public constant MAX_BATCH = 50;

    // ---- Immutable contracts ------------------------------------------------
    IERC20 public immutable token;
    IERC721 public immutable nft;

    // ---- Configuration ------------------------------------------------------
    /// @notice HYPE fee charged for a community claim. NFT claims are free.
    uint256 public communityClaimFee;

    /// @notice Receives withdrawn HYPE fees.
    address public feeRecipient;

    // ---- Accounting ---------------------------------------------------------
    /// @notice ELYZ claimed from the NFT pool.
    uint256 public nftClaimedTotal;

    /// @notice ELYZ claimed from the community pool.
    uint256 public communityClaimedTotal;

    /// @notice Number of NFT claim transactions.
    uint256 public nftClaimCount;

    /// @notice Number of community claim transactions (unique wallets).
    uint256 public communityClaimCount;

    /// @notice Community claim fees accrued and not yet withdrawn.
    uint256 public accruedFees;

    /// @notice Whether a specific NFT id has already claimed its reward.
    mapping(uint256 tokenId => bool) public nftClaimed;

    /// @notice Whether a wallet has already claimed the community reward.
    mapping(address wallet => bool) public communityClaimed;

    // ---- Events -------------------------------------------------------------
    event NftClaimed(address indexed wallet, uint256 tokenCount, uint256 amount);
    event CommunityClaimed(address indexed wallet, uint256 amount, uint256 fee);
    event CommunityClaimFeeUpdated(uint256 fee);
    event FeeRecipientUpdated(address indexed recipient);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event SurplusWithdrawn(address indexed to, uint256 amount);
    event NativeSurplusWithdrawn(address indexed to, uint256 amount);

    // ---- Errors -------------------------------------------------------------
    error ZeroAddress();
    error ZeroQuantity();
    error BatchTooLarge(uint256 max);
    error IncorrectFee(uint256 required, uint256 sent);
    error NotNftOwner(uint256 tokenId);
    error NftAlreadyClaimed(uint256 tokenId);
    error CommunityAlreadyClaimed();
    error PoolExhausted();
    error NoFees();
    error NoSurplus();
    error FeeTransferFailed();

    /// @param token_ ELYZ token that funds both reward pools.
    /// @param nft_ ElyziumaNFT collection used to verify holder claims.
    ///        Immutable for the life of this claim contract.
    /// @param communityClaimFee_ HYPE fee for one community claim. May be zero.
    /// @param feeRecipient_ Receives withdrawn community claim fees.
    /// @param initialOwner Address that can configure, pause, and withdraw fees.
    constructor(
        IERC20 token_,
        IERC721 nft_,
        uint256 communityClaimFee_,
        address feeRecipient_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            address(token_) == address(0) || address(nft_) == address(0)
                || feeRecipient_ == address(0)
        ) {
            revert ZeroAddress();
        }

        token = token_;
        nft = nft_;
        communityClaimFee = communityClaimFee_;
        feeRecipient = feeRecipient_;
    }

    /// @notice Accept direct HYPE transfers as recoverable native surplus.
    receive() external payable {}

    // ---- Claims -------------------------------------------------------------

    /// @notice Claim 10,000 ELYZ for each NFT id in `tokenIds`. Free apart from gas.
    /// @dev The caller must own every id and no id may have claimed before.
    ///      Duplicate ids revert because the first occurrence marks the id.
    /// @param tokenIds NFT ids to claim. Bounded by {MAX_BATCH}.
    function claimNft(uint256[] calldata tokenIds) external nonReentrant whenNotPaused {
        uint256 count = tokenIds.length;
        if (count == 0) revert ZeroQuantity();
        if (count > MAX_BATCH) revert BatchTooLarge(MAX_BATCH);

        uint256 amount = count * NFT_REWARD;
        if (nftClaimedTotal + amount > NFT_POOL) revert PoolExhausted();

        for (uint256 i = 0; i < count; ++i) {
            uint256 tokenId = tokenIds[i];
            if (nftClaimed[tokenId]) revert NftAlreadyClaimed(tokenId);
            if (nft.ownerOf(tokenId) != msg.sender) revert NotNftOwner(tokenId);
            nftClaimed[tokenId] = true;
        }

        nftClaimedTotal += amount;
        nftClaimCount += 1;

        token.safeTransfer(msg.sender, amount);

        emit NftClaimed(msg.sender, count, amount);
    }

    /// @notice Claim 1,000 ELYZ once per wallet from the community pool.
    function claimCommunity() external payable nonReentrant whenNotPaused {
        if (communityClaimed[msg.sender]) revert CommunityAlreadyClaimed();
        if (msg.value != communityClaimFee) {
            revert IncorrectFee(communityClaimFee, msg.value);
        }
        if (communityClaimedTotal + COMMUNITY_REWARD > COMMUNITY_POOL) {
            revert PoolExhausted();
        }

        communityClaimed[msg.sender] = true;
        communityClaimedTotal += COMMUNITY_REWARD;
        communityClaimCount += 1;
        accruedFees += msg.value;

        token.safeTransfer(msg.sender, COMMUNITY_REWARD);

        emit CommunityClaimed(msg.sender, COMMUNITY_REWARD, msg.value);
    }

    // ---- Views --------------------------------------------------------------

    /// @notice ELYZ still available in the NFT pool.
    function nftPoolRemaining() external view returns (uint256) {
        return NFT_POOL - nftClaimedTotal;
    }

    /// @notice ELYZ still available in the community pool.
    function communityPoolRemaining() external view returns (uint256) {
        return COMMUNITY_POOL - communityClaimedTotal;
    }

    /// @notice Total ELYZ claimed from both pools.
    function totalClaimed() external view returns (uint256) {
        return nftClaimedTotal + communityClaimedTotal;
    }

    /// @notice Number of claim transactions across both pools.
    function totalClaims() external view returns (uint256) {
        return nftClaimCount + communityClaimCount;
    }

    // ---- Owner --------------------------------------------------------------

    /// @notice Update the HYPE fee for a community claim.
    function setCommunityClaimFee(uint256 newFee) external onlyOwner {
        communityClaimFee = newFee;
        emit CommunityClaimFeeUpdated(newFee);
    }

    /// @notice Update the address that receives withdrawn fees.
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Send accrued community claim fees to {feeRecipient}.
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accruedFees;
        if (amount == 0) revert NoFees();

        accruedFees = 0;
        (bool ok,) = feeRecipient.call{value: amount}("");
        if (!ok) revert FeeTransferFailed();

        emit FeesWithdrawn(feeRecipient, amount);
    }

    /// @notice Withdraw ELYZ above the outstanding NFT + community liabilities.
    /// @dev The owner can never withdraw tokens that back unclaimed rewards.
    function withdrawSurplus(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroQuantity();

        uint256 outstanding =
            (NFT_POOL - nftClaimedTotal) + (COMMUNITY_POOL - communityClaimedTotal);
        uint256 balance = token.balanceOf(address(this));
        uint256 surplus = balance > outstanding ? balance - outstanding : 0;
        if (amount > surplus) revert NoSurplus();

        token.safeTransfer(to, amount);

        emit SurplusWithdrawn(to, amount);
    }

    /// @notice Withdraw native HYPE accidentally sent to the contract.
    /// @dev Accrued fees are excluded; use {withdrawFees} for those.
    function withdrawNativeSurplus(address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();

        uint256 balance = address(this).balance;
        if (balance <= accruedFees) revert NoSurplus();

        uint256 amount = balance - accruedFees;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert FeeTransferFailed();

        emit NativeSurplusWithdrawn(to, amount);
    }
}
