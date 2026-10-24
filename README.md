# Elyziuma

A daily ELYZ claim and an NFT launchpad on **Elysium** (chain ID `99901`). Wallets claim a fixed amount once every 24 hours, gated by a native ETH or HYPE balance on Hyperliquid, HyperEVM, Ethereum, Base, or Ink. The launchpad mints an already-deployed NFT collection on Elysium, with automatic OpenSea SeaDrop support.

The repository contains:

- `ElyziumaToken` - fixed-supply ERC-20 (`ELYZ`, 18 decimals).
- `DailyClaim` - EIP-712-authorized faucet with a 24-hour cooldown, owner controls, and a final-sweep mechanic.
- `ElyziumaNFT` - the 2,222-piece ERC-721A collection on Elysium, with an on-chain public mint phase.
- A Next.js 16 / React 19 frontend with RainbowKit, wagmi, and viem.
- Server routes for cross-chain eligibility checks, claim authorizations, contract inspection, and launchpad settings.
- A claim owner console at `/admin` and a launchpad console at `/admin/launchpad`.

> ELYZ is an experimental token with no monetary value. Elysium is pre-launch and the chain may be reset. Nothing here is financial advice.

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
| Binance Agent ID gate (v4) | **Replaced** with the cross-chain 0.001 native-token eligibility check + EIP-712 signature |
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

1. The browser asks `/api/eligibility` to read the wallet's native balance on Hyperliquid, HyperEVM, Ethereum, Base, and Ink.
2. If any chain holds at least `0.001` of its native token, the browser asks `/api/claim` for an authorization.
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
chainId:           99901
verifyingContract: NEXT_PUBLIC_CLAIM_ADDRESS
type:              Claim(address wallet,uint256 amount,uint256 nonce,uint256 deadline)
```

---

## Launchpad

`/launchpad` mints an already-deployed NFT collection on Elysium. The collection address, RPC, price, mint method, and per-wallet limit are stored in `data/launchpad.json` and edited from `/admin/launchpad`.

The mint layer is deliberately flexible:

- **Auto-detect** reads the collection at runtime and scans for common public mint selectors (`mint(address,uint256)`, `mint(uint256)`, `publicMint(uint256)`, `mintPublic(uint256)`, `claim(address,uint256)`, `mintTo(address)`, `safeMint(address)`).
- **SeaDrop** calls `mintPublic(nftContract, feeRecipient, minterIfNotPayer, quantity)` on the canonical SeaDrop contract (`0x00005EA00Ac477B1030CE78506496e8C2dE24bf5`) or the SeaDrop address allowed by the collection.
- **Manual override** pins a specific method when detection is ambiguous or the contract uses a custom ABI.
- The server resolves EIP-1967 and EIP-1167 proxies, reads ERC-721 / ERC-1155 interfaces, and inspects the public drop (price, start/end, per-wallet limit, fee BPS, fee recipient).

### The Elyziuma collection contract

`contracts/src/ElyziumaNFT.sol` is the collection this repo ships. It is an ERC-721A contract with `name = "Elyziuma"` and `symbol = "ELYZ"`, a hard cap of `MAX_SUPPLY = 2222` tokens, and a public cap of `MAX_PER_WALLET = 5` tokens per wallet.

It keeps the mint phase on-chain, so the contract - not the saved settings - decides what is live:

| Phase | Entry point | Rules |
| --- | --- | --- |
| Public | `publicMint(uint256 quantity)` | Anyone, while `publicMintOpen` is true. Capped by `MAX_PER_WALLET`. Priced at `publicPrice`. |
| Owner | `ownerMint(address to, uint256 quantity)` | Free, exempt from the per-wallet cap, still bounded by `MAX_SUPPLY`. |

The public mint rejects a payment that does not match the on-chain price exactly, and the per-wallet counter only counts public mints.

The owner controls the public phase (`setPublicMintOpen`, `setPublicPrice`), the metadata root (`setBaseURI`), and the treasury (`withdraw`).

Token URIs resolve to `{baseURI}{tokenId}.json` and token ids start at `1`.

The launchpad reads this contract directly. The server probe picks up `publicPrice`, `publicMintOpen`, and `MAX_PER_WALLET`, and the browser then follows the live phase: it shows the public price and calls `publicMint` while the public phase is open.

### Launchpad runtime network settings

The app targets one Elysium network at a time. `NEXT_PUBLIC_ELYSIUM_CHAIN_ID` picks the starting network at build time (`99901` mainnet, `99801` testnet), and the admin console can switch the live chain and RPC at runtime:

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
| `chainId` | Elysium network the launchpad targets: `99901` or `99801` |
| `collectionAddress` | Already-deployed NFT collection on that network |
| `rpcUrl` | Runtime Elysium RPC for reads and the browser transport |
| `maxPerWallet` | App-level wallet limit; on-chain limits still apply |
| `maxSupply` | Fallback supply cap when the contract does not expose one |
| `mintPrice` | HYPE per NFT for generic mints; SeaDrop price overrides it |
| `mintMethod` | Auto-detect, SeaDrop, or a specific generic selector |
| `seaDropAddress` | Optional explicit SeaDrop contract |
| `feeRecipient` | SeaDrop fee recipient when the drop restricts recipients |
| `title`, `tagline`, `description` | Public launchpad copy |
| `coverImage` | `https://`, `ipfs://`, or `ar://` cover image |
| `websiteUrl`, `twitterUrl`, `discordUrl` | Public social links |

Settings are written atomically through the store described above. The file backend writes `data/launchpad.json` (override with `LAUNCHPAD_CONFIG_PATH`), which is gitignored. On a multi-instance deployment, use a shared store or point every instance at the same one.

---

## Quick start

Requirements:

- Node.js 20+ and npm
- Foundry (for contracts)
- A funded Elysium deployer key and a claim-signer key

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. With zero addresses in `.env.local`, the UI runs in preview mode and the claim button is disabled. The launchpad can still show its setup state until a collection is configured.

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
| `NEXT_PUBLIC_CLAIM_ADDRESS` | Deployed `DailyClaim` address |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Deployed `ElyziumaToken` address |
| `NEXT_PUBLIC_ELYSIUM_CHAIN_ID` | Elysium network the app starts on: `99901` or `99801` |
| `NEXT_PUBLIC_ELYSIUM_RPC_URL` | Default Elysium RPC for the browser transport |
| `NEXT_PUBLIC_ELYSIUM_EXPLORER_URL` | Optional explorer override for the default chain |
| `NEXT_PUBLIC_LAUNCHPAD_COLLECTION_ADDRESS` | Optional default NFT collection. The owner console manages the same collection |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID; injected wallets work without it |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata and OG images |

### Server variables

| Variable | Purpose |
| --- | --- |
| `FAUCET_SIGNER_PRIVATE_KEY` | EIP-712 signer private key. Must match the contract `signer` |
| `ELYSIUM_RPC_URL` | Initial server-side Elysium RPC |
| `LAUNCHPAD_CONFIG_STORE` | `file` or `kv`; auto-detects a KV database when its credentials are present |
| `LAUNCHPAD_CONFIG_PATH` | Optional settings file path for the file backend; defaults to `data/launchpad.json` |
| `LAUNCHPAD_CONFIG_KEY` | Optional key inside the KV database; defaults to `elyziuma:launchpad` |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel KV credentials. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are also supported |
| `LAUNCHPAD_ADMIN_ADDRESSES` | Optional allowlist of launchpad admins, as comma-separated addresses |
| `ETH_RPC_URL`, `HYPEREVM_RPC_URL`, `BASE_RPC_URL`, `INK_RPC_URL` | Optional eligibility RPC overrides. Hyperliquid (HyperCore) is read from the official info API |
| `ELIGIBILITY_THRESHOLD_WEI` | Optional threshold override; defaults to `1000000000000000` (0.001 native token per chain) |

The signer key can only authorize claims. It cannot withdraw faucet tokens or change contract settings.

### Deploy variables

| Variable | Default |
| --- | --- |
| `DEPLOYER_PRIVATE_KEY` | Required |
| `CLAIM_SIGNER_ADDRESS` | Deployer address |
| `TOKEN_SUPPLY` | `21000000000000000000000000` (21M) |
| `FAUCET_ALLOCATION` | `18900000000000000000000000` (18.9M) |
| `DAILY_AMOUNT` | `100000000000000000000` (100 ELYZ) |
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
export CLAIM_SIGNER_ADDRESS=0x...
export ELYSIUM_RPC_URL=https://rpc.elyspump.com

forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$ELYSIUM_RPC_URL" \
  --broadcast
```

The script logs:

- `ElyziumaToken` address
- `DailyClaim` address
- token supply, faucet allocation, and daily amount

Deploy the NFT collection on its own:

```bash
cd contracts
export DEPLOYER_PRIVATE_KEY=0x...
export NFT_BASE_URI=ipfs://bafycollection/
export NFT_PUBLIC_PRICE=0.05ether

forge script script/DeployNFT.s.sol:DeployNFT \
  --rpc-url "$ELYSIUM_RPC_URL" \
  --broadcast
```

The script logs the `ElyziumaNFT` address, the collection name and symbol, the supply cap, and both prices. Set the returned address as `collectionAddress` in the launchpad console, or as `NEXT_PUBLIC_LAUNCHPAD_COLLECTION_ADDRESS` before building.

After deployment:

1. Set `NEXT_PUBLIC_TOKEN_ADDRESS` and `NEXT_PUBLIC_CLAIM_ADDRESS` in `.env.local`.
2. Set `FAUCET_SIGNER_PRIVATE_KEY` to the key for `CLAIM_SIGNER_ADDRESS`.
3. Rebuild the frontend.
4. Open `/api/health` and confirm `signerMatches: true` and `paused: false`.
5. Open `/admin` with the owner wallet to manage the faucet.
6. Open `/admin/launchpad` with the collection owner or the claim owner to configure the mint.

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
  "chainId": 99901,
  "claimAddress": "0x...",
  "eligibleChain": "Base"
}
```

Errors include `NOT_ELIGIBLE`, `COOLDOWN`, `PAUSED`, `FAUCET_EMPTY`, `SIGNER_MISCONFIGURED`, `VERIFICATION_UNAVAILABLE`, and `RATE_LIMITED`.

### `GET /api/health`

Reads the claim contract and checks that the server signer matches the contract signer. Useful after deployment or signer rotation.

### `GET /api/launchpad/config`

Returns the public launchpad settings, including the chain info and a `configured` flag. No secrets are exposed.

### `GET /api/launchpad/contract?address=0x...`

Reads the collection through the configured RPC. Returns name, symbol, owner, standard, supply, proxy implementation, detected mint methods, SeaDrop drop info, and - for the Elyziuma collection - the on-chain `elyziumaDrop` (public price, phase state, and per-wallet limit). Results are cached for 30 seconds per RPC/address combination.

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

---

## Owner consoles

### Claim console — `/admin`

`/admin` is a client-side owner console. It reads the owner address from the contract and exposes:

- Update the daily amount.
- Pause / unpause claims.
- Withdraw faucet tokens to a treasury wallet.
- Rotate the EIP-712 signer.
- View total claimed, claims, unique claimers, and faucet balance.

All actions are ordinary contract transactions and require the connected wallet to be the owner. Ownership uses OpenZeppelin `Ownable2Step`; transferring ownership requires the new owner to accept.

### Launchpad console — `/admin/launchpad`

`/admin/launchpad` edits the launchpad settings:

- Elysium network (testnet or mainnet) and runtime RPC.
- Collection address.
- Mint method, price, max per wallet, and max supply.
- SeaDrop contract and fee recipient.
- Public copy, cover image, and social links.
- Contract inspection with detected selectors, proxy implementation, and SeaDrop drop details.

Every save is a signed message. No gas is spent and no contract ownership is delegated. Switching the network or the RPC takes effect on the next request, with no redeploy.

### Collection console — `/admin/collection`

`/admin/collection` manages the `ElyziumaNFT` contract itself. It reads the owner address from the contract and exposes every owner method:

- Open or close the public mint phase.
- Set the public price.
- Set the base URI that serves per-token metadata.
- Owner mint to any address, exempt from the per-wallet cap.
- Withdraw the HYPE collected by public mints.
- Transfer or renounce ownership.

All actions are ordinary contract transactions and require the connected wallet to be the owner. The console follows the network and the collection the launchpad is pointed at, so both are changed from `/admin/launchpad`.

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
- The NFT collection's own mint rules, supply caps, and wallet limits.

### Enforced off-chain

- Native ETH or HYPE balance of at least 0.001 on Hyperliquid, HyperEVM, Ethereum, Base, or Ink.
- Per-IP and per-address rate limits.
- Re-check of the on-chain state before signing.
- Launchpad admin signatures with a five-minute window and replay guard.
- RPC chain ID and collection bytecode checks before saving settings.

### Limitations

- Cross-chain balances cannot be read by an Elysium contract. The signature is the bridge between the off-chain check and the on-chain claim. A compromised signer can authorize claims that did not pass the balance check; protect the signer key.
- The 0.001 native-token check is a bot speed bump, not sybil-proof identity. A determined operator can fund many wallets with 0.001 of a native token.
- Rate limiting and the launchpad replay guard are in-memory. On a multi-instance deployment, replace them with a shared store such as Redis or Upstash.
- Public RPCs can be rate-limited or unavailable. The launchpad admin can set a different RPC, but a read-only RPC will still reject mint transactions.
- On a serverless platform the launchpad settings need the KV backend, because the filesystem is read-only. With the file backend, a chain or RPC change is lost on the next deploy.
- Switching the launchpad to a chain where the collection has not been deployed yet fails the save, because the contract address is checked for bytecode on the selected chain.
- The launchpad is a generic interface. It cannot guarantee that a collection's metadata, royalties, or mint rules are correct. Verify the collection address and SeaDrop fee recipient before minting.
- The owner can withdraw the faucet and change the daily amount. This is intentional, but it is a trust assumption.
- Elysium is pre-launch and may reset. Do not treat ELYZ or the NFT collection as an investment.

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
- Collection metadata, token ids, and `tokenURI`
- Public mint, per-wallet cap, and payment checks
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
  admin/page.tsx                 Claim owner console
  admin/launchpad/page.tsx       Launchpad settings console
  api/claim/route.ts             Eligibility re-check + EIP-712 signing
  api/eligibility/route.ts       Five-chain balance check
  api/health/route.ts            Signer / contract health
  api/launchpad/config/route.ts  Public launchpad settings
  api/launchpad/contract/route.ts Contract + SeaDrop inspection
  api/admin/launchpad/route.ts   Signed settings read/save
  api/admin/launchpad/inspect/route.ts Signed inspection
  globals.css                    Design system and animations
  layout.tsx                     Fonts, metadata, providers
  opengraph-image.tsx            Social card
components/
  launchpad/                     Hero, mint card, details, teaser
  admin-launchpad.tsx            Launchpad settings console
  admin-dashboard.tsx            Claim owner console
  ...                            Claim card, eligibility, stats, feed, FAQ
contracts/
  src/ElyziumaToken.sol          Fixed-supply ERC-20
  src/DailyClaim.sol             EIP-712 faucet
  src/ElyziumaNFT.sol            ERC-721A collection, public mint phase
  test/DailyClaim.t.sol          Foundry tests
  test/ElyziumaNFT.t.sol         Foundry tests
  script/Deploy.s.sol            Deploy + fund
  script/DeployNFT.s.sol         Deploy the collection
hooks/                           Claim flow, eligibility, clocks, launchpad config
lib/
  abis.ts                        Claim/token ABIs
  chains.ts                      Elysium + eligibility chains
  config.ts                      Public config and links
  launchpad/                     Shared types, config, ABIs, status, runtime
  server/                        RPC, eligibility, signing, launchpad persistence
data/launchpad.json              Runtime settings (gitignored, created on save)
```

---

## Elysium links

- Bridge: https://elyspump.com
- Explorer: https://scan.elyspump.com
- Docs: https://elysium.kinetiq.xyz/docs

## License

MIT for the application code. The Shaniu reference contract is the property of its authors; only its publicly verified mechanics were used as a reference.
