# Shaniu contract analysis

Reference contracts on BNB Smart Chain (chain ID `56`):

| Contract | Address | Role |
| --- | --- | --- |
| Original | `0xa09f463441a4cca39db2f188162caf6aba98be67` | `Shaniu`, the contract linked in the request |
| Successor | `0x67b8c7abeb7a6b6ef29f15032423afab4006888f` | `Shaniu` v4 with Agent ID gate and Merkle airdrop |

Both were verified with Solidity `0.8.26`, optimizer enabled, 200 runs. The verified source was retrieved from ContractReader's public `POST /api/contract` endpoint because BscScan blocks automated source requests with a Cloudflare challenge.

## Original contract mechanics

The original `Shaniu` is a single ERC-20 with the claim logic built in.

### Supply

| Constant | Value | Share |
| --- | --- | --- |
| `TOTAL_SUPPLY` | `21,000,000e18` | 100% |
| `CLAIM_POOL` | `18,900,000e18` | 90% |
| `OWNER_SHARE` | `2,100,000e18` | 10% |

The constructor credits `OWNER_SHARE` to `initialOwner` and `CLAIM_POOL` to the contract itself. `totalSupply()` is a pure function returning 21M; there is no mint.

### Claim fee

- `CLAIM_FEE_USD = 0.2e8` — **$0.20**, not $20. The 8-decimal value is intentional.
- `claimFeeWei()` reads Chainlink's BNB/USD feed at `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` and returns `(CLAIM_FEE_USD * 1e18) / price`.
- `claim()` is payable and requires `msg.value >= claimFeeWei()`.
- The full `msg.value` is forwarded to `FEE_RECIPIENT = 0x51872254046BF76BF71DC941896943293D45624F`.

### Claim rules

- `claimOpen` starts `true`; the last claim flips it to `false`.
- `hasClaimed[msg.sender]` allows **one claim per address, ever**.
- `claimCount` and `poolRemaining` track activity.
- The claim amount is randomized from `keccak256(block.prevrandao, block.timestamp, msg.sender, claimCount)`:

| Tier | Probability | Amount |
| --- | --- | --- |
| Common | 87.9% | 50–150 |
| Lucky | 10% | 300–500 |
| Critical | 2% | 1,000–3,000 |
| Jackpot | 0.1% | 21,000 |
| Bonus Egg | remainder | Sweeps the remaining pool |

- If a roll would exceed `poolRemaining`, or fewer than 50 tokens remain, the claim receives the remaining pool and `claimOpen` becomes `false`.
- `owner` is the zero address. There are no admin functions in the original.

### ERC-20 implementation

The token implements `transfer`, `approve`, and `transferFrom` directly with mappings. It does not use OpenZeppelin. `transferFrom` decrements the allowance unless it is `type(uint256).max`.

## Successor (v4) changes

The successor keeps the same supply, fee, pool, and lottery, then adds:

- `AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` — `claim()` requires `AGENT_ID.balanceOf(msg.sender) > 0`.
- `airdropRoot`, `airdropTotal`, `airdropRemaining` — a Merkle airdrop for wallets that claimed on the original contract.
- `claimAirdrop(amount, proof)` and `airdropBatch(to, amounts, proofs)`.
- The constructor takes `(initialOwner, _airdropRoot, _airdropTotal)` and reduces `poolRemaining` by the airdrop total.

The live successor had `airdropTotal = 214,823e18` and `airdropRemaining = 0` at the time of analysis.

## What Elyziuma copies

- 21M fixed supply.
- 90% claim pool / 10% deployer-treasury share.
- The final-claim sweep: when the pool cannot cover a full payout, the claimant receives the remainder and the pool empties.
- The general shape of a permissionless claim with on-chain accounting (`totalClaims`, `uniqueClaimers`, `totalClaimed`).

## What Elyziuma deliberately changes

| Shaniu | Elyziuma | Reason |
| --- | --- | --- |
| One claim per address, ever | One claim per wallet every 24 hours | Explicit product requirement |
| Random lottery amount | Owner-set fixed daily amount | Explicit product requirement |
| $0.20 payable claim | Free claim; gas only | No fee was requested |
| Binance Agent ID gate | Cross-chain 0.001 native-token check + EIP-712 signature | Elysium cannot read the source chains on-chain |
| Single contract, owner renounced | Separate token + faucet, owner controls | Allows refilling, pausing, signer rotation, and emergency withdrawal |
| `block.prevrandao` randomness | No randomness | Avoids validator-influenced payouts |

The result is a Shaniu-shaped claim pool with the daily-claim behavior requested for Elyziuma, rather than a literal copy that would have contradicted the earlier requirements.
