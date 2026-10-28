# Elyziuma

A two-pool ELYZ claim and an NFT launchpad on **Elysium Testnet** (chain ID `99801`; mainnet is `99901`). NFT holders claim 10,000 ELYZ per NFT, every wallet can claim 1,000 ELYZ once, and the community claim is gated by a native ETH or HYPE balance on Hyperliquid, HyperEVM, Ethereum, Base, or Ink. The launchpad mints an already-deployed NFT collection on Elysium, with automatic OpenSea SeaDrop support.

The repository contains:

- `ElyziumaToken` - fixed-supply ERC-20 (`ELYZ`, 18 decimals, 34.33M cap).
- `ElyziumaClaim` - two-pool claim contract: 10,000 ELYZ per NFT (free) and 1,000 ELYZ once per wallet with an owner-set HYPE fee.
- `ElyziumaNFT` - the 2,222-piece ERC-721A collection on Elysium, with an on-chain public mint phase.
- A Next.js 16 / React 19 frontend with RainbowKit, wagmi, and viem.
- Server routes for cross-chain eligibility checks, claim authorizations, contract inspection, and launchpad settings.
- A single admin console at `/admin` covering the claim, launchpad, collection, and ownership settings.

> ELYZ is an experimental token with no monetary value. Elysium is pre-launch and the chain may be reset. Nothing here is financial advice.

---

## What was taken from Shaniu

The reference contract was verified on BscScan and its source was retrieved through ContractReader's public contract API. The original `Shaniu` contract uses:

| Shaniu mechanic | Elyziuma decision |
| --- | --- |
| 21,000,000 fixed supply | **Changed** to 34,330,000: 22.22M NFT pool + 11.11M community pool + 1M owner allocation |
| 90% claim pool / 10% owner share | **Changed** to 64.73% NFT pool / 32.36% community pool / 2.91% owner |
| One claim per address, ever | **Changed** to one 1,000 ELYZ community claim per wallet and one 10,000 ELYZ claim per NFT |
| $0.20 payable claim in BNB via Chainlink | **Changed** to an owner-set HYPE fee on the community claim; NFT claims are free |
| Randomized lottery tiers (50–150, 300–500, 1,000–3,000, 21,000, bonus sweep) | **Not copied** — both pools pay fixed amounts |
| Last claim sweeps the remaining pool | **Not copied** — each pool has an exact cap; underfunded claims revert |
| Binance Agent ID gate (v4) | **Replaced** with a community-only UI 0.001 ETH / 0.05 HYPE check |
| Owner renounced / no admin controls | **Changed** — the owner sets the community fee and fee recipient, pauses, and withdraws fees/surplus; the reward pools cannot be withdrawn |

The Shaniu code is a single token contract with built-in claim logic. Elyziuma keeps the token and claim contract separate so the claim can be paused, refilled, or replaced without migrating the token. The full source-level comparison is in [`docs/shaniu-analysis.md`](docs/shaniu-analysis.md).

---

## Tokenomics

| Parameter | Value |
| --- | --- |
| Name / symbol | Elyziuma / ELYZ |
| Decimals | 18 |
| Total supply | 34,330,000 ELYZ |
| NFT holder pool | 22,220,000 ELYZ (64.73%) — 10,000 per NFT |
| Community pool | 11,110,000 ELYZ (32.36%) — 1,000 per wallet |
| Owner allocation | 1,000,000 ELYZ (2.91%) |
| Claim fee | Community claim only — owner-set HYPE fee (default `0`); NFT claims are free |

The deploy script transfers 22,220,000 ELYZ to `ElyziumaClaim` for the NFT pool, another 11,110,000 for the community pool, and 1,000,000 to the owner allocation recipient. The pool caps are constants in the claim contract, so the script enforces the fixed 34.33M split instead of accepting allocation overrides.

The owner allocation is transferred at deployment, so the owner receives it before any claim is opened. The claim contract cannot pay a partial reward: if a pool is underfunded or exhausted, the claim reverts.

---

## How a claim works

### NFT holder claim

1. The browser asks `/api/claim/eligibility` for the wallet's NFT ids and claim status.
2. The server reads the collection's `totalMinted`, checks `ownerOf` for each minted id, and filters out ids already marked `nftClaimed`.
3. The wallet submits `claimNft(tokenIds)` on Elysium. The contract verifies that the caller owns every id, that no id has claimed, and that the batch is at most 50. NFT claims are free.
4. The contract marks each id claimed and transfers `tokenIds.length * 10,000 ELYZ`.

Each NFT can claim once. If an unclaimed NFT is transferred, the new owner can claim it; if it was already claimed, the new owner cannot claim it again. The NFT and community pools are independent, so a holder can claim both, and a wallet that already claimed the community reward can still claim any unclaimed NFT it later receives.

### Community claim

1. The browser reads the wallet's `communityClaimed` flag from the claim contract.
2. The UI checks that the wallet holds the community minimum on a supported mainnet chain.
3. The wallet submits `claimCommunity()` on Elysium. The contract verifies that the wallet has not claimed, that the community pool can cover 1,000 ELYZ, and that the exact HYPE fee was sent.
4. The contract marks the wallet claimed and transfers 1,000 ELYZ.

### The community balance check

The community claim requires at least 0.001 ETH on Ethereum, Base, or Ink, or 0.05 HYPE on Hyperliquid or HyperEVM. This is a UI gate only. The claim contract does not read balances on other chains. A direct contract call bypasses the check, but it still has to satisfy the one-time community claim, the pool cap, and the community fee (if one is set). NFT holder claims are free and are not gated by this check.

The `/claim` page is private while claims are being prepared. It is gated on the server by the same owner session as `/admin`, is `noindex, nofollow`, and is not linked from the public navigation or footer. Only the collection owner wallet can connect and sign in to view it. This is a page-level gate, not an on-chain restriction: the deployed claim contracts remain callable by anyone who knows their address.

---

## Launchpad

`/launchpad` mints an already-deployed NFT collection on Elysium. The collection address, RPC, mint method, launch start time, mint balance check, and interface limits are stored in `data/launchpad.json`. The admin console edits the network/RPC, the launch countdown, mint requirements, and the collection contract. The collection's own on-chain cap always wins.

The mint layer is deliberately flexible:

- **Auto-detect** reads the collection at runtime and scans for common public mint selectors (`mint(address,uint256)`, `mint(uint256)`, `publicMint(uint256)`, `mintPublic(uint256)`, `claim(address,uint256)`, `mintTo(address)`, `safeMint(address)`).
- **SeaDrop** calls `mintPublic(nftContract, feeRecipient, minterIfNotPayer, quantity)` on the canonical SeaDrop contract (`0x00005EA00Ac477B1030CE78506496e8C2dE24bf5`) or the SeaDrop address allowed by the collection.
- **Manual override** pins a specific method when detection is ambiguous or the contract uses a custom ABI.
- The server resolves EIP-1967 and EIP-1167 proxies, reads ERC-721 / ERC-1155 interfaces, and inspects the public drop (price, start/end, per-wallet limit, fee BPS, fee recipient).

### The Elyziuma collection contract

`contracts/src/ElyziumaNFT.sol` is the collection this repo ships. It is an ERC-721A contract with `name = "Elyziuma"` and `symbol = "ELYZ"`, a hard cap of `MAX_SUPPLY = 2222` tokens, and an owner-controlled public cap of `maxPerWallet` (starts at 1). `MAX_SUPPLY` is a compile-time constant; the owner can change `maxPerWallet` at any time.

It keeps the mint phase on-chain, so the contract - not the saved settings - decides what is live:

| Phase | Entry point | Rules |
| --- | --- | --- |
| Public | `publicMint(uint256 quantity)` | Anyone, while `publicMintOpen` is true. Capped by `maxPerWallet`. Priced at `publicPrice`. |
| Owner | `setMaxPerWallet(uint256 newMax)` | Updates the public per-wallet cap. Must be at least 1. Existing tokens are unaffected. |
| Owner | `ownerMint(address to, uint256 quantity)` | Free, exempt from the per-wallet cap, still bounded by `MAX_SUPPLY`. |

The public mint rejects a payment that does not match the on-chain price exactly, and the per-wallet counter only counts public mints.

The owner controls the public phase (`setPublicMintOpen`, `setPublicPrice`), the metadata root (`setBaseURI`), and the treasury (`withdraw`).

Token URIs resolve to `{baseURI}{tokenId}.json` and token ids start at `1`.

The launchpad reads this contract directly. The server probe picks up `publicPrice`, `publicMintOpen`, and `maxPerWallet`, and the browser then follows the live phase: it shows the public price and calls `publicMint` while the public phase is open.

Before submitting a mint, when `mintBalanceCheck` is enabled (the default), the mint panel checks the connected wallet's mainnet ETH/HYPE balance through the same five-chain eligibility service used by the claim flow. The wallet must hold at least `0.06 HYPE` or `0.0025 ETH` on Hyperliquid, HyperEVM, Ethereum, Base, or Ink. The mint chain's testnet HYPE balance is deliberately not used, because testnet tokens are free and cannot deter bots. A failed balance read blocks the button with a retry action. The admin console can turn this guard off from **Mint requirements**; when it is off, the balance panel is hidden and the mint button is not gated. This is a UI guard only; the contract remains the final authority, so a funded wallet can still call it directly.

### Launchpad runtime network settings

The app targets one Elysium network at a time. `NEXT_PUBLIC_ELYSIUM_CHAIN_ID` picks the starting network at build time (`99801` testnet by default, `99901` mainnet), and the admin console can switch the live chain and RPC at runtime:

- The chain, the RPC, and the explorer are stored together and applied as one switch.
- Both Elysium networks are registered with wagmi at build time, so the wallet can follow the active chain without a rebuild.
- The browser uses a dynamic viem transport, so saved changes apply without rebuilding.
- Server reads use a client keyed by the current RPC.
- Saving validates `eth_chainId` against the selected chain, and checks that the collection has code on it.

Switching networks is therefore a runtime operation: no redeploy is needed to move between testnet and mainnet, or to change the RPC.

Elysium is pre-launch and the community RPC is read-only in some deployments. Contract reads work, but mint transactions may need a transaction-capable RPC. Set that URL in the launchpad admin console before announcing a mint.

### Where the settings are stored

The launchpad settings are persisted through a small store abstraction:

| Backend | When | Notes |
| --- | --- | --- |
| `file` | Self-hosted, with a persistent volume | A JSON file, written atomically. `LAUNCHPAD_CONFIG_PATH` overrides the path. |
| `kv` | Serverless (Vercel, etc.) | Vercel KV or Upstash Redis over their shared REST API. |

`LAUNCHPAD_CONFIG_STORE` forces a backend. When it is unset, a KV database is used automatically when `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or the Upstash equivalents) are present, and the file backend is the fallback.

Serverless platforms have a read-only filesystem, so runtime changes to the chain or the RPC only survive a redeploy when the settings live in a KV database.

### Launchpad admin authorization

A wallet is authorized when at least one of these is true:

1. It owns the configured collection contract (`owner()`), looked up on every Elysium network so a chain switch does not lock the owner out.
2. It owns the claim contract (`owner()`).
3. It is listed in `LAUNCHPAD_ADMIN_ADDRESSES`, which is the escape hatch for when the collection address is cleared and no collection can be read.

Saves and contract inspections are signed messages (no gas, no on-chain transaction). The server verifies the signature, a five-minute timestamp window, and a replay guard before writing the settings.

The collection owner check is also applied to a candidate collection during inspection, so the owner of a new collection can inspect it before saving it as the active collection.

Because authorization is purely on-chain, both `NEXT_PUBLIC_CLAIM_ADDRESS` and `NEXT_PUBLIC_TOKEN_ADDRESS` must be set for the claim owner to be recognized. Set them before using the launchpad console on a fresh deployment.

### Launchpad settings

| Setting | Purpose |
| --- | --- |
| `enabled` | Public pause switch for the launchpad page |
| `startAt` | Unix seconds when the mint opens; `0` disables the countdown |
| `mintBalanceCheck` | Require at least `0.06 HYPE` or `0.0025 ETH` on a supported mainnet chain before enabling the mint button; defaults to `true` |
| `chainId` | Elysium network the launchpad targets: `99801` or `99901` |
| `collectionAddress` | Already-deployed NFT collection on that network |
| `rpcUrl` | Runtime Elysium RPC for reads and the browser transport |
| `maxPerWallet` | Interface fallback; the on-chain `maxPerWallet` wins for Elyziuma |
| `maxSupply` | Fallback supply cap when the contract does not expose one |
| `mintPrice` | HYPE per NFT for generic mints; SeaDrop price overrides it |
| `mintMethod` | Auto-detect, SeaDrop, or a specific generic selector |
| `seaDropAddress` | Optional explicit SeaDrop contract |
| `feeRecipient` | SeaDrop fee recipient when the drop restricts recipients |
| `title`, `tagline`, `description` | Public launchpad copy |
| `coverImage` | `https://`, `ipfs://`, or `ar://` cover image |
| `websiteUrl`, `twitterUrl`, `discordUrl` | Public social links |

Settings are written atomically through the store described above. The file backend writes `data/launchpad.json` (override with `LAUNCHPAD_CONFIG_PATH`), which is gitignored. On a multi-instance deployment, use a shared store or point every instance at the same one.

When `startAt` is set and still in the future, `/launchpad` stays fully visible and the mint button shows a live countdown. The button becomes mintable automatically once the start time is reached. This is a launchpad UI schedule, not an on-chain mint restriction; the contract's own phase still decides whether a mint succeeds.

---

## Quick start

Requirements:

- Node.js 20+ and npm
- Foundry (for contracts)
- A funded Elysium deployer key

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. With zero addresses in `.env.local`, the UI runs in preview mode and the claim buttons are disabled. The launchpad can still show its setup state until a collection is configured.

> `NEXT_PUBLIC_*` values are inlined at build time. Set them before `npm run build`, not only before `npm start`.

---

## Dependency notes

### Why `@x402/*` is a direct dependency

RainbowKit pulls in `wagmi/connectors` -> `@base-org/account` -> `@coinbase/cdp-sdk`. The CDP
SDK declares `@x402/core`, `@x402/evm`, `@x402/svm`, and `@x402/extensions` as *optional* peer
dependencies and loads them with a dynamic `import()` so that only x402 payment signing needs them.

Turbopack still resolves those specifiers at build time, so a build without the packages on disk
fails with:

```text
Error: Module not found: Can't resolve '@x402/core/client'
```

npm 10 installs optional peer dependencies, npm 11 does not, so the failure only shows up on
fresh installs with a newer npm (CI, Vercel). Declaring the four packages as regular dependencies
makes every install resolve them, regardless of npm version.

Nothing in the app calls the x402 code path. The packages are only listed to satisfy the bundler.

### `overrides` and `allowScripts`

`package.json` also carries two npm policies that keep installs deterministic across npm versions:

- `overrides.use-sync-external-store` pins the React shim to `^1.7.0`. `valtio` (a transitive
  dependency of the `porto` connector) asks for `1.2.0`, whose peer range stops at React 18, so
  npm reports `ERESOLVE overriding peer dependency` on every install. `1.7.0` supports React 19.
- `allowScripts` pre-approves the four dependencies that ship an install script
  (`bufferutil`, `utf-8-validate`, `keccak`, `unrs-resolver`). npm 11 refuses to run install
  scripts until they are approved, and warns about the ones it skipped.

Both are npm-10 compatible: older npm versions ignore the fields and behave as before.

---

## Environment

### Public variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLAIM_ADDRESS` | Deployed `ElyziumaClaim` address |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Deployed `ElyziumaToken` address |
| `NEXT_PUBLIC_ELYSIUM_CHAIN_ID` | Elysium network the app starts on: `99801` (default) or `99901` |
| `NEXT_PUBLIC_ELYSIUM_RPC_URL` | Default Elysium RPC for the browser transport |
| `NEXT_PUBLIC_ELYSIUM_EXPLORER_URL` | Optional explorer override for the default chain |
| `NEXT_PUBLIC_LAUNCHPAD_COLLECTION_ADDRESS` | Optional default NFT collection. The owner console manages the same collection |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID; injected wallets work without it |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata and OG images |

### Server variables

| Variable | Purpose |
| --- | --- |
| `FAUCET_DRIP_PRIVATE_KEY` | Optional. Funded Elysium testnet wallet that sends the in-app HYPE drip. Without it, `/faucet` links to Kinetiq's official faucet |
| `FAUCET_RPC_URL` | Optional. Transaction-capable Elysium testnet RPC for the drip; defaults to the testnet endpoint |
| `FAUCET_DRIP_AMOUNT` | Optional. HYPE per in-app claim; defaults to `0.01` (max `1`) |
| `FAUCET_COOLDOWN_HOURS` | Optional. Per-wallet cooldown for the drip; defaults to `24` |
| `FAUCET_CLAIMS_KEY` | Optional KV key for the drip cooldowns; defaults to `elyziuma:faucet:claims` |
| `ELYSIUM_RPC_URL` | Initial server-side Elysium RPC |
| `LAUNCHPAD_CONFIG_STORE` | `file` or `kv`; auto-detects a KV database when its credentials are present |
| `LAUNCHPAD_CONFIG_PATH` | Optional settings file path for the file backend; defaults to `data/launchpad.json` |
| `LAUNCHPAD_CONFIG_KEY` | Optional key inside the KV database; defaults to `elyziuma:launchpad` |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel KV credentials. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are also supported |
| `LAUNCHPAD_ADMIN_ADDRESSES` | Optional allowlist of launchpad admins, as comma-separated addresses |
| `ADMIN_OWNER_ADDRESS` | Wallet allowed to unlock `/admin`. Defaults to the Elyziuma collection owner |
| `ETH_RPC_URL`, `HYPEREVM_RPC_URL`, `BASE_RPC_URL`, `INK_RPC_URL` | Optional eligibility RPC overrides. Hyperliquid (HyperCore) is read from the official info API |

### Deploy variables

| Variable | Default |
| --- | --- |
| `DEPLOYER_PRIVATE_KEY` | Required |
| `NFT_ADDRESS` | Required; the `ElyziumaNFT` collection on the claim chain |
| `OWNER_ALLOCATION_RECIPIENT` | Claim owner address (receives the fixed 1M owner allocation) |
| `CLAIM_OWNER` | Deployer address |
| `FEE_RECIPIENT` | Deployer address |
| `COMMUNITY_CLAIM_FEE` | `0` (wei) |
| `NFT_OWNER` | Deployer address |
| `NFT_BASE_URI` | `ipfs://bafycollection/` |
| `NFT_PUBLIC_PRICE` | `0` (wei) |

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

Deploy to Elysium:

```bash
cd contracts
export DEPLOYER_PRIVATE_KEY=0x...
export NFT_ADDRESS=0x...                         # ElyziumaNFT on the same chain
export FEE_RECIPIENT=0x...                       # receives withdrawn HYPE fees
export ELYSIUM_RPC_URL=https://testnet-rpc.elysium.kinetiq.xyz # mainnet: https://rpc.elyspump.com
export FOUNDRY_PROFILE=claim                     # compile for Elysium's Paris EVM

forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$ELYSIUM_RPC_URL" \
  --broadcast
```

The script logs:

- `ElyziumaToken` address
- `ElyziumaClaim` address
- NFT collection and fee recipient
- token supply, NFT pool, community pool, and owner allocation
- the community claim fee (NFT claims are free)
- the claim contract's ELYZ balance

Set `CLAIM_OWNER` to the wallet that should administer the claim. It must match the `/admin` session owner (`ADMIN_OWNER_ADDRESS`, which defaults to the collection owner) or that wallet must be updated too; otherwise the claim owner cannot open the owner console.

Deploy the NFT collection on its own:

```bash
cd contracts
export DEPLOYER_PRIVATE_KEY=0x...
export NFT_OWNER=0x...
export NFT_BASE_URI=https://your-site.example/api/nft/
export NFT_PUBLIC_PRICE=0
export FOUNDRY_PROFILE=nft

forge script script/DeployNFT.s.sol:DeployNFT \
  --rpc-url "$ELYSIUM_RPC_URL" \
  --broadcast
```

`MAX_SUPPLY` is a compile-time constant. `maxPerWallet` is owner-controlled and can be changed from the NFT Collection section; lowering it affects future public mints only.

The script logs the `ElyziumaNFT` address, the collection name and symbol, the supply cap, and both prices. Set the returned address as `collectionAddress` in the launchpad console, or as `NEXT_PUBLIC_LAUNCHPAD_COLLECTION_ADDRESS` before building.

After deployment:

1. Set `NEXT_PUBLIC_TOKEN_ADDRESS` and `NEXT_PUBLIC_CLAIM_ADDRESS` in `.env.local`.
2. Rebuild the frontend; `NEXT_PUBLIC_*` values are inlined at build time.
3. Open `/api/health` and confirm `funded: true` and `paused: false`.
4. Open `/admin` with the owner wallet. Set the community claim fee and the fee recipient. NFT claims are always free.
5. Confirm the claim contract holds `33,330,000 ELYZ` and the owner allocation recipient holds `1,000,000 ELYZ`.

The claim contract's NFT address is immutable. If you change `NEXT_PUBLIC_LAUNCHPAD_COLLECTION_ADDRESS` later, the claim contract still points at the collection it was deployed with.

---

## API

### `POST /api/eligibility`

Request:

```json
{ "address": "0x..." }
```

Response includes the balance, the per-chain minimum, and the status for each supported chain, the best qualifying chain, and `checkedAt`. Results are cached for 30 seconds per address.

### `POST /api/claim/eligibility`

Request:

```json
{ "address": "0x..." }
```

Success response:

```json
{
  "nft": {
    "address": "0x...",
    "balance": "2",
    "rewardPerNft": "10000000000000000000000",
    "claimFee": "0",
    "maxBatch": 50,
    "tokenIds": ["1", "2"],
    "claimedTokenIds": [],
    "claimableTokenIds": ["1", "2"],
    "claimableAmount": "20000000000000000000000"
  },
  "community": {
    "claimed": false,
    "claimableAmount": "1000000000000000000000",
    "claimFee": "0"
  },
  "pools": {
    "nftRemaining": "22220000000000000000000000",
    "communityRemaining": "11110000000000000000000000"
  },
  "paused": false,
  "chainTime": 1760000000,
  "blockNumber": 123456
}
```

The endpoint scans the collection's minted token ids with `ownerOf`, then reads `nftClaimed` for the ids owned by the wallet. It is cached for a few seconds per block. It does not enforce the community balance check; the browser combines it with `/api/eligibility`.

Errors include `NOT_CONFIGURED`, `ELIGIBILITY_FAILED`, and `RATE_LIMITED`.

### `GET /api/faucet?address=0x...`

Returns the in-app faucet state: whether a drip wallet is configured, the amount per claim, the cooldown, the faucet's remaining balance, and the next claim time for the address. When the drip wallet is not configured, `configured` is `false` and the page falls back to Kinetiq's official faucet.

### `POST /api/faucet`

Sends the testnet HYPE drip to the connected wallet.

Request:

```json
{ "address": "0x..." }
```

Success response:

```json
{
  "transactionHash": "0x...",
  "amount": "10000000000000000",
  "chainId": 99801,
  "explorerUrl": "https://elysium.kinetiq.xyz/testnet-explorer/transaction/0x..."
}
```

Errors include `NOT_CONFIGURED`, `COOLDOWN`, `FAUCET_EMPTY`, `FAUCET_UNAVAILABLE`, `RATE_LIMITED`, and `SEND_FAILED`. Cooldowns are persisted in the configured KV database, or in `data/faucet-claims.json` for the file backend.

### `GET /api/health`

Reads the claim contract and reports whether claims are paused, whether the contract is funded for the outstanding NFT + community pools, the current community fee, the fee recipient, and accrued fees. Useful after deployment or a refill.

### `GET /api/launchpad/config`

Returns the public launchpad settings, including the chain info and a `configured` flag. No secrets are exposed.

### `GET /api/launchpad/contract?address=0x...`

Reads the collection through the configured RPC. Returns name, symbol, owner, standard, supply, proxy implementation, detected mint methods, SeaDrop drop info, and - for the Elyziuma collection - the on-chain `elyziumaDrop` (public price, phase state, and per-wallet limit). When the on-chain drop getters exist but cannot be read, the response carries `elyziumaDropError` instead of falling back to saved settings. Results are cached for 30 seconds per RPC/address combination; degraded reads are not cached so the next poll can recover.

### `GET /api/admin/launchpad?address=0x...`

Returns the full launchpad config plus the admin status for the wallet (collection owner, claim owner).

### `PUT /api/admin/launchpad`

Signed save. Body:

```json
{
  "address": "0x...",
  "timestamp": 1760000000,
  "signature": "0x...",
  "payload": { "enabled": true, "collectionAddress": "0x..." }
}
```

The payload hash is included in the signed message. The server validates the signature, admin authorization, RPC chain ID, and contract bytecode before writing the file.

### `POST /api/admin/launchpad/inspect`

Signed contract inspection. The payload accepts `rpcUrl`, `collectionAddress`, `seaDropAddress`, and `feeRecipient`. Useful for checking a collection before saving it.

### `GET /api/admin/session`

Returns whether the current browser has an owner session, plus the configured owner address and session lifetime.

### `POST /api/admin/session`

Exchanges a signed owner login message for an `HttpOnly` session cookie. Body:

```json
{
  "address": "0x...",
  "issuedAt": 1760000000,
  "expiresAt": 1760043200,
  "nonce": "random-value",
  "signature": "0x..."
}
```

The signature must cover `address`, both timestamps, and the nonce. Only `ADMIN_OWNER_ADDRESS` is accepted, and the login message must be less than five minutes old. Sessions last 12 hours.

### `DELETE /api/admin/session`

Clears the owner session cookie (the **Lock** button in the console footer).

---

## Admin console

`/admin` is a focused NFT-collection console. It is `noindex, nofollow`, and every write is gated by on-chain ownership or a signed message.

### Owner-only access

The console is gated on the server before any console data is rendered. Without a valid session the page only sends the unlock screen. To unlock, the collection owner connects the wallet configured in `ADMIN_OWNER_ADDRESS` — it defaults to `0xb181FDFe71A0a0f56574D88f22B6BaFD142192F6` — and signs a free message. The server verifies the signature, the owner address, and the five-minute login window, then sets a 12-hour `HttpOnly` session cookie. The cookie carries the signed message itself, so it cannot be forged or edited without the owner's key. The footer has a **Lock** action that clears the session immediately.

The private `/claim` page uses the same session. Its link appears in the main navigation only after the owner unlocks a session, and signing out hides it again.

Writes remain independently protected: contract calls are owner transactions, and launchpad settings changes require their own signed message.

### 01 — NFT Collection

- **Network & runtime:** the Elysium network and RPC the app uses for collection reads and writes. Changes are signed messages with no gas and a five-minute window; the server verifies the chain ID and collection bytecode before saving.
- **Contract owner actions:** open or close the public mint, set the public price, set the base URI, owner-mint to any address, withdraw the HYPE balance, and read the collection name, symbol, owner, supply, hard cap, and treasury.
- `maxPerWallet` is owner-controlled. The admin console exposes a setter; lowering it blocks further public mints once a wallet reaches the new cap, but existing tokens are unaffected.

### 02 — Ownership & danger zone

Transfer ownership to another wallet or renounce it permanently. Both are two-step confirmations and irreversible.

### 03 — Claim & rewards

Community claim fee, fee recipient, pause/unpause, fee withdrawal, token-surplus withdrawal, pool balances, and health. NFT claims are free. This section is separate from the NFT collection and requires the claim owner. The claim owner can never withdraw the outstanding reward pools; `withdrawSurplus` only releases ELYZ above the NFT + community liabilities.

`/admin/launchpad` and `/admin/collection` are kept as 307 redirects to `/admin#collection`.

The public launchpad's display settings - collection address, mint method, max supply, SeaDrop, drop copy, and links - still live in `data/launchpad.json` or the configured KV store. The admin console edits the network/RPC, the launch countdown, mint requirements, and the collection contract.

---

## Security model

### Enforced on-chain

- Fixed 34.33M supply; no post-deploy mint.
- NFT ownership is checked per token id; each NFT can claim 10,000 ELYZ once, and a claimed NFT cannot be claimed again after transfer.
- The community reward is claimable once per wallet.
- The NFT and community pools are independent, so both can be claimed by the same wallet.
- Exact NFT and community pool caps; underfunded claims revert instead of sweeping a partial amount.
- Pausable claims.
- Exact HYPE fee per community claim; NFT claims are free. Fees accrue in the contract.
- Owner-only community-fee, fee-recipient, pause, fee-withdrawal, and surplus-withdrawal controls.
- The owner cannot withdraw tokens that back unclaimed rewards.
- Reentrancy protection.
- Batch limit of 50 NFT ids per transaction.
- The NFT collection's own mint rules, supply caps, and wallet limits.

### Enforced off-chain

- Community balance check: at least 0.001 ETH on Ethereum, Base, or Ink, or 0.05 HYPE on Hyperliquid or HyperEVM. This is a UI gate, not a contract check.
- Per-IP rate limits on `/api/eligibility` and `/api/claim/eligibility`.
- Short-lived claim-eligibility caching keyed by block number.
- Launchpad admin signatures with a five-minute window and replay guard.
- Owner-console sessions require a fresh owner-wallet signature, are stored in a 12-hour `HttpOnly` cookie, and are verified on the server before the console or the private `/claim` page renders.
- RPC chain ID and collection bytecode checks before saving settings.

### Limitations

- The community balance check is a UI gate only. A user calling the claim contract directly bypasses it; the contract still enforces one-time community eligibility, pool caps, and the community fee.
- The check is a bot speed bump, not sybil-proof identity. A determined operator can fund many wallets with 0.001 ETH or 0.05 HYPE.
- The owner can set the community claim fee, including a fee high enough to make community claims unattractive, and can pause claims. NFT claims are free. The owner cannot withdraw the reward pools, but community fees are a trust assumption.
- The NFT pool is sized for all 2,222 NFTs. If the collection does not sell out, the unclaimed portion stays in the claim contract; the owner cannot withdraw it through `withdrawSurplus`.
- The community pool is sized for 11,110 wallets. If fewer wallets claim, the remainder stays in the claim contract.
- Rate limiting and the launchpad replay guard are in-memory. On a multi-instance deployment, replace them with a shared store such as Redis or Upstash.
- The in-app faucet sends from a hot wallet configured with `FAUCET_DRIP_PRIVATE_KEY`. Treat that key as spendable testnet funds only, keep a small balance in it, and never reuse the deployer or claim-owner key. Cooldowns persist in KV or `data/faucet-claims.json`; on a multi-instance serverless deployment, use the KV backend.
- The in-app faucet is rate-limited by IP and wallet and uses a per-wallet cooldown, but it does not include a captcha. Keep the drip wallet's balance modest, or add a captcha before promoting the faucet widely.
- Public RPCs can be rate-limited or unavailable. The launchpad admin can set a different RPC, but a read-only RPC will still reject mint transactions.
- On a serverless platform the launchpad settings need the KV backend, because the filesystem is read-only. With the file backend, a chain or RPC change is lost on the next deploy.
- Switching the launchpad to a chain where the collection has not been deployed yet fails the save, because the contract address is checked for bytecode on the selected chain.
- The claim contract's NFT address is immutable. Changing the active collection in the launchpad settings does not repoint the claim contract.
- The launchpad is a generic interface. It cannot guarantee that a collection's metadata, royalties, or mint rules are correct. Verify the collection address and SeaDrop fee recipient before minting.
- Elysium is pre-launch and may reset. Do not treat ELYZ or the NFT collection as an investment.

---

## Tests

```bash
cd contracts
forge test -vv
```

The suite covers:

- 34.33M supply and the 22.22M / 11.11M / 1M allocation split
- NFT claim single and batch, exact amount, free claim, and accounting
- Duplicate ids, non-owner calls, already-claimed ids, and batch limits
- Claimed NFTs cannot be re-claimed after a transfer; unclaimed NFTs can be claimed by the new owner
- Community claim once per wallet and once per distinct wallet
- NFT holders can also claim the community reward, and community claimants can later claim an unclaimed NFT
- Community fee handling, fee updates, zero-fee claims, and fee recipient changes
- Pause/unpause
- Fee withdrawal and native / token surplus withdrawal
- The owner cannot withdraw tokens that back unclaimed reward pools
- Owner-only controls
- Collection metadata, token ids, and `tokenURI`
- Public mint, per-wallet cap, cap updates, and payment checks
- Owner mint exemptions and the supply cap
- Withdraw and zero-address guards

Frontend checks:

```bash
npm run lint
npm run build
```

---

## Project structure

```text
app/
  page.tsx                       Landing page
  launchpad/page.tsx             NFT launchpad
  faucet/page.tsx                Testnet HYPE faucet (in-app claim + official links)
  admin/page.tsx                 Unified admin console, owner-signature gate
  admin/launchpad/page.tsx       Redirect to /admin#collection
  admin/collection/page.tsx      Redirect to /admin#collection
  api/claim/eligibility/route.ts NFT ownership + claim status for a wallet
  api/faucet/route.ts            In-app testnet HYPE drip
  api/eligibility/route.ts       Five-chain balance check (UI gate)
  api/health/route.ts            Claim funding / pause / fee health
  api/launchpad/config/route.ts  Public launchpad settings
  api/launchpad/contract/route.ts Contract + SeaDrop inspection
  api/admin/launchpad/route.ts   Signed settings read/save
  api/admin/launchpad/inspect/route.ts Signed inspection
  api/admin/session/route.ts     Owner unlock, session status, and lock
  globals.css                    Design system and animations
  layout.tsx                     Fonts, metadata, providers
  opengraph-image.tsx            Social card
components/
  admin/
    admin-console.tsx            Shell, access panel, section navigation
    admin-access-gate.tsx        Owner connect + sign unlock screen
    network-runtime-panel.tsx    Signed network/RPC save
    claim-section.tsx            Community fee, pools, pause, and withdrawals
    collection-section.tsx       NFT contract owner controls + network
    ownership-section.tsx        Transfer / renounce
    admin-data.ts                Shared reads and admin status
    admin-ui.tsx                 Console primitives
  launchpad/                     Hero, mint card, details, teaser
  ...                            Claim cards, tokenomics strip, eligibility, stats, feed, FAQ
contracts/
  src/ElyziumaToken.sol          Fixed-supply ERC-20
  src/ElyziumaClaim.sol          Two-pool NFT + community claim
  src/ElyziumaNFT.sol            ERC-721A collection, public mint phase
  test/ElyziumaClaim.t.sol       Foundry tests
  test/ElyziumaNFT.t.sol         Foundry tests
  script/Deploy.s.sol            Deploy + fund both pools
  script/DeployNFT.s.sol         Deploy the collection
hooks/                           Claim flow, claim eligibility, clocks, launchpad config
lib/
  abis.ts                        Claim/token/NFT-read ABIs
  chains.ts                      Elysium + eligibility chains
  config.ts                      Public config and links
  launchpad/                     Shared types, config, ABIs, status, runtime
  server/                        RPC, claim eligibility, launchpad persistence
data/launchpad.json              Runtime settings (gitignored, created on save)
```

---

## Elysium links

- Bridge: https://elyspump.com
- Explorer: https://elysium.kinetiq.xyz/testnet-explorer (mainnet: https://scan.elyspump.com)
- Docs: https://elysium.kinetiq.xyz/docs

## License

MIT for the application code. The Shaniu reference contract is the property of its authors; only its publicly verified mechanics were used as a reference.
