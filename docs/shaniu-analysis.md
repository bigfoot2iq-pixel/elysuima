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

## What Elyziuma v2 keeps

- A fixed-supply token with the claim logic in a separate contract.
- Permissionless claims with on-chain accounting (`totalClaimed`, `totalClaims`, per-pool totals).
- A funded pool that pays a fixed amount per claim.

## What Elyziuma v2 changes

| Shaniu | Elyziuma v2 | Reason |
| --- | --- | --- |
| 21M fixed supply | 50M: 22.22M NFT pool + 22.22M community pool + 5.56M owner allocation | Product tokenomics |
| 90% claim pool / 10% owner | 44.44% NFT / 44.44% community / 11.12% owner | Product tokenomics |
| One claim per address, ever | One 1,000 ELYZ community claim per wallet + one 10,000 ELYZ claim per NFT | Explicit product requirement |
| Random lottery amount | Fixed 10,000 per NFT / 1,000 per wallet | Explicit product requirement |
| $0.20 payable claim | Owner-set HYPE fee on the community claim; NFT claims are free | Product requirement |
| Binance Agent ID gate | UI-only 0.001 native-token threshold | The contract does not read other chains |
| Single contract, owner renounced | Separate token + claim contract, owner controls | Allows a community fee, pause, fee withdrawal, and surplus withdrawal |
| Final-claim sweep | No sweep; underfunded claims revert | Keeps the per-NFT and per-wallet amounts exact |
| `block.prevrandao` randomness | No randomness | Avoids validator-influenced payouts |

The result is a two-pool claim model built for Elyziuma rather than a literal Shaniu copy. The threshold remains a UI anti-bot check only.
