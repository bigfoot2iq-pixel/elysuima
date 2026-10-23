// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Elyziuma Daily Claim
/// @notice A token faucet with an owner-set daily amount and a 24-hour per-wallet cooldown.
/// @dev Cross-chain eligibility cannot be verified on-chain. A trusted off-chain signer issues an
///      EIP-712 authorization only after checking the wallet's native ETH balance on the supported
///      chains. The signature is bound to `msg.sender`, the current amount, a one-time nonce and a
///      short deadline, so it cannot be replayed or used by another wallet.
contract DailyClaim is EIP712, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error InvalidAmount();
    error InvalidNonce(uint256 expected);
    error InvalidSignature();
    error SignatureExpired();
    error ClaimTooSoon(uint256 nextClaimAt);
    error FaucetEmpty();
    error ZeroAddress();

    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(address wallet,uint256 amount,uint256 nonce,uint256 deadline)");

    uint256 public constant COOLDOWN = 24 hours;

    IERC20 public immutable token;
    uint256 public dailyAmount;
    address public signer;

    mapping(address wallet => uint256 timestamp) public lastClaim;
    mapping(address wallet => uint256 nonce) public nonces;

    uint256 public totalClaimed;
    uint256 public totalClaims;
    uint256 public uniqueClaimers;

    event Claimed(address indexed wallet, uint256 amount, uint256 nonce, uint256 timestamp);
    event DailyAmountUpdated(uint256 amount);
    event SignerUpdated(address indexed signer);

    constructor(IERC20 token_, uint256 dailyAmount_, address signer_)
        EIP712("ElyziumaDailyClaim", "1")
        Ownable(msg.sender)
    {
        if (address(token_) == address(0) || signer_ == address(0)) revert ZeroAddress();
        if (dailyAmount_ == 0) revert InvalidAmount();

        token = token_;
        dailyAmount = dailyAmount_;
        signer = signer_;

        emit DailyAmountUpdated(dailyAmount_);
        emit SignerUpdated(signer_);
    }

    /// @notice Claim the current daily amount. The caller must have a valid off-chain authorization.
    /// @param amount Must equal `dailyAmount` at execution time.
    /// @param nonce Must equal the caller's current nonce.
    /// @param deadline Unix timestamp after which the authorization is invalid.
    /// @param signature EIP-712 signature from `signer` over (msg.sender, amount, nonce, deadline).
    function claim(uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature)
        external
        nonReentrant
        whenNotPaused
    {
        if (amount == 0 || amount != dailyAmount) revert InvalidAmount();
        if (block.timestamp > deadline) revert SignatureExpired();

        uint256 expectedNonce = nonces[msg.sender];
        if (nonce != expectedNonce) revert InvalidNonce(expectedNonce);

        uint256 nextClaimAt = lastClaim[msg.sender] + COOLDOWN;
        if (lastClaim[msg.sender] != 0 && block.timestamp < nextClaimAt) {
            revert ClaimTooSoon(nextClaimAt);
        }

        if (ECDSA.recover(hashClaim(msg.sender, amount, nonce, deadline), signature) != signer) {
            revert InvalidSignature();
        }

        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) revert FaucetEmpty();

        // Shaniu-style final sweep: the last claim takes whatever is left when the
        // pool can no longer cover a full daily amount.
        uint256 payout = amount > balance ? balance : amount;

        bool firstClaim = lastClaim[msg.sender] == 0;

        nonces[msg.sender] = expectedNonce + 1;
        lastClaim[msg.sender] = block.timestamp;
        totalClaimed += payout;
        totalClaims += 1;
        if (firstClaim) uniqueClaimers += 1;

        token.safeTransfer(msg.sender, payout);

        emit Claimed(msg.sender, payout, nonce, block.timestamp);
    }

    /// @notice EIP-712 digest for a claim authorization. Exposed for clients and tests.
    function hashClaim(address wallet, uint256 amount, uint256 nonce, uint256 deadline)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(
            keccak256(abi.encode(CLAIM_TYPEHASH, wallet, amount, nonce, deadline))
        );
    }

    /// @notice Update the amount claimable every 24 hours.
    function setDailyAmount(uint256 newAmount) external onlyOwner {
        if (newAmount == 0) revert InvalidAmount();
        dailyAmount = newAmount;
        emit DailyAmountUpdated(newAmount);
    }

    /// @notice Rotate the off-chain authorization signer.
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        signer = newSigner;
        emit SignerUpdated(newSigner);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Withdraw claimable tokens from the faucet.
    function withdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        token.safeTransfer(to, amount);
    }
}
