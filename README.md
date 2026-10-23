# Elyziuma

A daily ELYZ claim page on **Elysium Testnet** (chain ID `99801`). Wallets claim a fixed amount once every 24 hours, gated by a native ETH balance on Ethereum, Abstract, Base, or Ink.

The repository contains:

- `ElyziumaToken` — fixed-supply ERC-20 (`ELYZ`, 18 decimals).
- `DailyClaim` — EIP-712-authorized faucet with a 24-hour cooldown, owner controls, and a final-sweep mechanic.
- A Next.js 16 / React 19 frontend with RainbowKit, wagmi, and viem.
- Server routes for cross-chain eligibility checks and short-lived claim authorizations.
- An owner console at `/admin`.

> ELYZ is a testnet token with no monetary value. Nothing here is financial advice.

---

## What was taken from Shaniu

The reference contract was verified on BscScan and its source was retrieved through ContractReader's public contract API. The original `Shaniu` contract uses:

| Shaniu mechanic | Elyziuma decision |
| --- | --- |
| 21,000,000 fixed supply | **Copied** |
| 90% claim pool / 10% owner share | **Copied** |
| One claim per address, ever | **Changed** to one claim per wallet every 24 hours, as requested |
| $0.20 payable claim in BNB via Chainlink | **Not copied** — ELYZ claims are free apart from Elysium gas |
| Randomized lottery tiers (50–150, 300–500, 1,000–3,000, 21,000, bonus sweep) | **Not copied** — the owner controls a fixed daily amount instead |
| Last claim sweeps the remaining pool | **Copied** |
| Binance Agent ID gate (v4) | **Replaced** with the cross-chain 0.001 ETH eligibility check + EIP-712 signature |
| Owner renounced / no admin controls | **Changed** — the owner can set the amount, rotate the signer, pause, and withdraw |

The Shaniu code is a single token contract with built-in claim logic. Elyziuma keeps the token and faucet separate so the faucet can be refilled, paused, or replaced without migrating the token. The full source-level comparison is in [`docs/shaniu-analysis.md`](docs/shaniu-analysis.md).

---

## Tokenomics

| Parameter | Value |
| --- | --- |
| Name / symbol | Elyziuma / ELYZ |
| Decimals | 18 |
| Total supply | 21,000,000 ELYZ |
| Claim pool | 18,900,000 ELYZ (90%) |
| Deployer / treasury | 2,100,000 ELYZ (10%) |
| Default daily amount | 100 ELYZ |
| Cooldown | 24 hours per wallet |
| Claim fee | None (gas only, paid in HYPE) |

The deploy script transfers the claim-pool allocation to `DailyClaim` and leaves the remaining 10% with the deployer. Both values are configurable at deploy time.

When the faucet can no longer cover a full daily amount, the next claim receives the remaining balance and empties the pool. This mirrors Shaniu's final "bonus egg" sweep.

---

## How a claim works

1. The browser asks `/api/eligibility` to read the wallet's native balance on Ethereum, Abstract, Base, and Ink.
2. If any chain holds at least `0.001` native ETH, the browser asks `/api/claim` for an authorization.
3. The server re-checks eligibility, reads the on-chain daily amount, nonce, cooldown, signer, and faucet balance, then signs an EIP-712 `Claim` message.
4. The wallet submits `claim(amount, nonce, deadline, signature)` on Elysium.
5. `DailyClaim` verifies:
   - `amount == dailyAmount`
   - the deadline has not passed
   - the nonce matches the wallet's current nonce
   - the 24-hour cooldown has elapsed
   - the signature recovers to the contract signer
   - the faucet has a non-zero balance
6. The faucet transfers `min(dailyAmount, faucetBalance)` and increments the wallet's nonce and last-claim timestamp.

The signature is bound to the wallet, amount, nonce, deadline, chain ID, and verifying contract. It expires after 10 minutes and cannot be replayed.

### EIP-712 domain

```text
name:              ElyziumaDailyClaim
version:           1
chainId:           99801
verifyingContract: NEXT_PUBLIC_CLAIM_ADDRESS
type:              Claim(address wallet,uint256 amount,uint256 nonce,uint256 deadline)
```

---

## Quick start

Requirements:

- Node.js 20+ and npm
- Foundry (for contracts)
- A funded Elysium Testnet deployer key and a claim-signer key

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. With zero addresses in `.env.local`, the UI runs in preview mode and the claim button is disabled.

> `NEXT_PUBLIC_*` values are inlined at build time. Set them before `npm run build`, not only before `npm start`.

---

## Environment

### Public variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLAIM_ADDRESS` | Deployed `DailyClaim` address |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Deployed `ElyziumaToken` address |
| `NEXT_PUBLIC_ELYSIUM_RPC_URL` | Elysium Testnet RPC |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID; injected wallets work without it |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata and OG images |

### Server variables

| Variable | Purpose |
| --- | --- |
| `FAUCET_SIGNER_PRIVATE_KEY` | EIP-712 signer private key. Must match the contract `signer` |
| `ELYSIUM_RPC_URL` | Server-side Elysium RPC |
| `ETH_RPC_URL`, `ABSTRACT_RPC_URL`, `BASE_RPC_URL`, `INK_RPC_URL` | Optional eligibility RPC overrides |
| `ELIGIBILITY_THRESHOLD_WEI` | Optional threshold override; defaults to `1000000000000000` (0.001 ETH) |

The signer key can only authorize claims. It cannot withdraw faucet tokens or change contract settings.

### Deploy variables

| Variable | Default |
| --- | --- |
| `DEPLOYER_PRIVATE_KEY` | Required |
| `CLAIM_SIGNER_ADDRESS` | Deployer address |
| `TOKEN_SUPPLY` | `21000000000000000000000000` (21M) |
| `FAUCET_ALLOCATION` | `18900000000000000000000000` (18.9M) |
| `DAILY_AMOUNT` | `100000000000000000000` (100 ELYZ) |

---

## Deploy contracts

On Windows, use the Foundry binary explicitly if `forge` resolves to Atlassian Forge:

```powershell
$env:PATH = "$env:USERPROFILE\.foundry\bin;$env:PATH"
forge --version
```

Install the test dependency once per clone, then run the suite:

```bash
cd contracts
forge install foundry-rs/forge-std
forge test -vv
```

Deploy to Elysium Testnet:

```bash
cd contracts
export DEPLOYER_PRIVATE_KEY=0x...
export CLAIM_SIGNER_ADDRESS=0x...
export ELYSIUM_RPC_URL=https://testnet-rpc.elysium.kinetiq.xyz

forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$ELYSIUM_RPC_URL" \
  --broadcast
```

The script logs:

- `ElyziumaToken` address
- `DailyClaim` address
- token supply, faucet allocation, and daily amount

After deployment:

1. Set `NEXT_PUBLIC_TOKEN_ADDRESS` and `NEXT_PUBLIC_CLAIM_ADDRESS` in `.env.local`.
2. Set `FAUCET_SIGNER_PRIVATE_KEY` to the key for `CLAIM_SIGNER_ADDRESS`.
3. Rebuild the frontend.
4. Open `/api/health` and confirm `signerMatches: true` and `paused: false`.
5. Open `/admin` with the owner wallet to manage the faucet.

If you do not pass `CLAIM_SIGNER_ADDRESS`, the deployer is used as the signer. For production, use a dedicated signer key.

---

## API

### `POST /api/eligibility`

Request:

```json
{ "address": "0x..." }
```

Response includes the balance and status for each supported chain, the threshold, the best qualifying chain, and `checkedAt`. Results are cached for 30 seconds per address.

### `POST /api/claim`

Request:

```json
{ "address": "0x..." }
```

Success response:

```json
{
  "amount": "100000000000000000000",
  "nonce": "0",
  "deadline": 1760000000,
  "signature": "0x...",
  "chainId": 99801,
  "claimAddress": "0x...",
  "eligibleChain": "Base"
}
```

Errors include `NOT_ELIGIBLE`, `COOLDOWN`, `PAUSED`, `FAUCET_EMPTY`, `SIGNER_MISCONFIGURED`, `VERIFICATION_UNAVAILABLE`, and `RATE_LIMITED`.

### `GET /api/health`

Reads the claim contract and checks that the server signer matches the contract signer. Useful after deployment or signer rotation.

---

## Owner console

`/admin` is a client-side owner console. It reads the owner address from the contract and exposes:

- Update the daily amount.
- Pause / unpause claims.
- Withdraw faucet tokens to a treasury wallet.
- Rotate the EIP-712 signer.
- View total claimed, claims, unique claimers, and faucet balance.

All actions are ordinary contract transactions and require the connected wallet to be the owner. Ownership uses OpenZeppelin `Ownable2Step`; transferring ownership requires the new owner to accept.

---

## Security model

### Enforced on-chain

- Fixed supply; no post-deploy mint.
- EIP-712 signature verification.
- Amount must equal the current daily amount.
- Per-wallet nonce prevents replay.
- 10-minute signature deadline.
- 24-hour cooldown.
- Pausable claims.
- Owner-only amount, signer, pause, and withdraw controls.
- Reentrancy protection.
- Final sweep pays at most the faucet balance.

### Enforced off-chain

- Native ETH balance of at least 0.001 on Ethereum, Abstract, Base, or Ink.
- Per-IP and per-address rate limits.
- Re-check of the on-chain state before signing.

### Limitations

- Cross-chain balances cannot be read by an Elysium contract. The signature is the bridge between the off-chain check and the on-chain claim. A compromised signer can authorize claims that did not pass the balance check; protect the signer key.
- The 0.001 ETH check is a bot speed bump, not sybil-proof identity. A determined operator can fund many wallets with 0.001 ETH.
- Rate limiting is in-memory. On a multi-instance deployment, replace it with a shared store such as Redis or Upstash.
- Public RPCs can be rate-limited or unavailable. Configure dedicated RPC URLs for production.
- The owner can withdraw the faucet and change the daily amount. This is intentional for a testnet, but it is a trust assumption.
- The frontend is a testnet interface. Verify contract addresses before interacting.

---

## Tests

```bash
cd contracts
forge test -vv
```

The suite covers:

- Fixed supply and faucet funding
- Successful claim and accounting
- 24-hour cooldown
- Signature expiry
- Nonce replay
- Wrong amount
- Wrong signer
- Signature bound to wallet
- Pause
- Withdraw
- Daily amount updates
- Signer rotation
- Empty faucet
- Unique claimers
- Final-sweep payout
- Owner-only controls

Frontend checks:

```bash
npm run lint
npm run build
```

---

## Project structure

```text
app/
  page.tsx                 Landing page
  admin/page.tsx           Owner console route
  api/claim/route.ts       Eligibility re-check + EIP-712 signing
  api/eligibility/route.ts Four-chain balance check
  api/health/route.ts      Signer / contract health
  globals.css              Design system and animations
  layout.tsx               Fonts, metadata, providers
  opengraph-image.tsx      Social card
components/                Claim card, eligibility, stats, feed, FAQ, admin
contracts/
  src/ElyziumaToken.sol    Fixed-supply ERC-20
  src/DailyClaim.sol       EIP-712 faucet
  test/DailyClaim.t.sol    20 Foundry tests
  script/Deploy.s.sol      Deploy + fund
hooks/                     Claim flow, eligibility polling, clock
lib/
  abis.ts                  Frontend ABIs
  chains.ts                Elysium + eligibility chains
  config.ts                Public config and links
  server/                  RPC, eligibility, signing, rate limits
```

---

## Elysium links

- Faucet: https://elysium.kinetiq.xyz/testnet-faucet
- Bridge: https://elysium.kinetiq.xyz/testnet-bridge
- Explorer: https://elysium.kinetiq.xyz/testnet-explorer
- Docs: https://elysium.kinetiq.xyz/docs

## License

MIT for the application code. The Shaniu reference contract is the property of its authors; only its publicly verified mechanics were used as a reference.
