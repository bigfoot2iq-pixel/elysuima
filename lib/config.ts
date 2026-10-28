import type { Address } from "viem";
import {
  explorerAddressFor,
  explorerTxFor,
  getChainExplorerUrl,
  getDefaultChainId,
} from "@/lib/chains";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const CLAIM_ADDRESS = (process.env.NEXT_PUBLIC_CLAIM_ADDRESS ??
  ZERO_ADDRESS) as Address;
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ??
  ZERO_ADDRESS) as Address;

/**
 * The chain the claim contracts live on. The launchpad and collection can point
 * at a different Elysium network, so the claim console pins its reads and
 * writes to this chain instead of following the wallet.
 */
export const CLAIM_CHAIN_ID = getDefaultChainId();

/**
 * Kinetiq's testnet faucet only exists on chain 99801. The in-app drip is
 * pinned to that chain regardless of the network the rest of the app targets.
 */
export const FAUCET_CHAIN_ID = 99801;

export const IS_CONFIGURED =
  CLAIM_ADDRESS.toLowerCase() !== ZERO_ADDRESS &&
  TOKEN_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "00000000000000000000000000000000";

export const TOKEN_FALLBACK = {
  name: "Elyziuma",
  symbol: "ELYZ",
  decimals: 18,
} as const;

/**
 * Product tokenomics in token base units. The claim page reads the live values
 * from the contracts and uses these only while the contracts are not
 * configured or a read is unavailable.
 */
export const TOKENOMICS = {
  totalSupply: 34_330_000n * 10n ** 18n,
  nftPool: 22_220_000n * 10n ** 18n,
  communityPool: 11_110_000n * 10n ** 18n,
  ownerAllocation: 1_000_000n * 10n ** 18n,
  nftReward: 10_000n * 10n ** 18n,
  communityReward: 1_000n * 10n ** 18n,
  nftSupply: 2_222n,
  communityWallets: 11_110n,
} as const;

export const LINKS = {
  bridge: "https://elyspump.com",
  elyspump: "https://elyspump.com/#/",
  boxa: "https://boxa.pro/#/bridge",
  faucet: "https://testnet.elysium.kinetiq.xyz/faucet/",
  testnetFaucet: "https://elysium.kinetiq.xyz/testnet-faucet",
  quicknodeFaucet: "https://faucet.quicknode.com/elysium/testnet",
  explorer: getChainExplorerUrl(getDefaultChainId()),
  docs: "https://elysium.kinetiq.xyz/docs",
  x: "https://x.com/Elyziumaa",
  kalos: "https://www.kalos.fun/collections/elyziuma",
} as const;

export function explorerAddress(address: string) {
  return explorerAddressFor(getDefaultChainId(), address);
}

export function explorerTx(hash: string) {
  return explorerTxFor(getDefaultChainId(), hash);
}
